/**
 * Figma DS-Foundation "Icons & Images" page → optimised SVGs + manifest.
 *
 *   icons/<brand>/<name>.svg   one file per Brand variant (empty placeholders skipped)
 *   icons/icons.json           every icon: Figma name, code name, aliases, files per brand
 *
 * Single-colour icons bound to a Modes variable (e.g. Icons/Primary) are written with
 * `currentColor`, so the app colours them with the matching token (--color-icon-primary)
 * and dark mode follows the theme. Two-tone icons and illustrations keep their colours.
 *
 * Usage: FIGMA_TOKEN=… npm run export:icons
 *   FIGMA_FILE_KEY   default: DS-Foundation
 *   FIGMA_ICONS_PAGE default: the "Icons & Images" page id
 *   ICONS_SUMMARY    optional path: plain-language change report (used as the PR description)
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { optimize } from 'svgo';

const TOKEN = process.env.FIGMA_TOKEN;
const FILE_KEY = process.env.FIGMA_FILE_KEY ?? 'ciJdK157glzYOMa1W5SPcF';
const PAGE_ID = process.env.FIGMA_ICONS_PAGE ?? '15:3848';
const OUT = new URL('../icons/', import.meta.url);
const API = 'https://api.figma.com/v1';
const BRANDS = ['Purple Garden', 'Kasamba', 'Psiquicos', 'Purple Ocean'];

export const kebab = s =>
  String(s)
    .replace(/&/g, 'and')
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();

const hex = ({ r, g, b }) =>
  '#' +
  [r, g, b]
    .map(v =>
      Math.round(v * 255)
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')
    .toUpperCase();

/** "Brand=Kasamba, Theme=Dark" → { Brand: 'Kasamba', Theme: 'Dark' } */
export const variantProps = name =>
  Object.fromEntries(
    name
      .split(',')
      .map(p => p.split('=').map(s => s.trim()))
      .filter(p => p.length === 2),
  );

/**
 * Description lines "Code: x · y", "Also known as: a, b" → fields.
 * Merged sets name a code per variant value: "Code: chevronUp (Up) · chevronDown (Down)" → codeFor.Up = 'chevronUp'.
 */
export function parseDescription(text = '') {
  // "Code:" for app code names, "Code (web):" for web-only ones (e.g. "Code (web): Menu").
  const line = key => text.match(new RegExp(`^${key}(?: \\(web\\))?:\\s*(.+)$`, 'mi'))?.[1].trim();
  const list = s => (s ? s.split(/\s*[·,]\s*/).filter(Boolean) : []);
  const entries = list(line('Code')?.replace(/\s+—.*$/, ''))
    .map(e => e.match(/^([A-Za-z][A-Za-z0-9]*)(?:\s*\(([^)]+)\))?$/))
    .filter(Boolean);
  return {
    code: entries.map(m => m[1]),
    codeFor: Object.fromEntries(entries.filter(m => m[2]).map(m => [m[2], m[1]])),
    aliases: list(line('Also known as')),
    note: text
      .split('\n')
      .filter(l => !/^(Code|File|Also known as):/i.test(l))
      .join(' ')
      .trim(),
  };
}

/** First top-level JSON object in a file that may hold several back to back. */
function firstDocument(raw) {
  let depth = 0;
  let inString = false;
  for (let i = 0; i < raw.length; i++) {
    const c = raw[i];
    if (inString) {
      if (c === '\\') i++;
      else if (c === '"') inString = false;
    } else if (c === '"') inString = true;
    else if (c === '{') depth++;
    else if (c === '}' && --depth === 0) return JSON.parse(raw.slice(raw.indexOf('{'), i + 1));
  }
  throw new Error('No JSON object found');
}

/** Figma variable id → "Icons/Primary", read from the GitFig export of the Modes collection. */
export function modesVariableNames() {
  const names = new Map();
  const raw = readFileSync(new URL('../tokens/figma-modes.json', import.meta.url), 'utf8');
  const doc = firstDocument(raw); // the file holds light and dark back to back; ids are the same
  const walk = (node, path) => {
    const id = node?.$extensions?.['com.figma.variableId'];
    if (id) names.set(id, path.join('/'));
    else if (node && typeof node === 'object') for (const [k, v] of Object.entries(node)) walk(v, [...path, k]);
  };
  walk(doc, []);
  return names;
}

/** "Icons/Channel/Chat" → "--color-icon-channel-chat" (matches build-tokens naming). */
export const cssVarFor = name => '--color-' + kebab(name.replace(/^Icons\//, 'Icon/'));

/**
 * How an icon is coloured: one Modes variable for every visible paint → currentColor,
 * otherwise keep the artwork's own colours.
 */
export function colouring(variant) {
  const paints = [];
  const visit = node => {
    if (node.visible === false) return;
    for (const p of [...(node.fills ?? []), ...(node.strokes ?? [])])
      if (p.visible !== false && p.type === 'SOLID') paints.push(p);
    node.children?.forEach(visit);
  };
  variant.children?.forEach(visit);
  const ids = new Set(paints.map(p => p.boundVariables?.color?.id ?? null));
  if (paints.length && ids.size === 1 && !ids.has(null)) return { mode: 'currentColor', variableId: [...ids][0] };
  return { mode: 'original' };
}

export function toCurrentColor(svg) {
  return svg.replace(/(fill|stroke)="(?!none|url)[^"]+"/g, '$1="currentColor"');
}

const optimise = svg =>
  optimize(svg, {
    multipass: true,
    plugins: ['preset-default'], // svgo 4 keeps viewBox by default
  }).data;

async function figma(path) {
  const res = await fetch(API + path, { headers: { 'X-Figma-Token': TOKEN } });
  if (!res.ok) throw new Error(`Figma API ${res.status} on ${path}: ${await res.text()}`);
  return res.json();
}

/** Every component set on the page with its section, description and non-empty variants. */
export function collectSets(page, componentSets) {
  const sets = [];
  const visit = (node, section) => {
    if (node.type === 'SECTION') section = node.name;
    if (node.type === 'COMPONENT_SET') {
      sets.push({
        id: node.id,
        name: node.name,
        section,
        description: componentSets[node.id]?.description ?? node.description ?? '',
        variants: node.children.filter(v => v.type === 'COMPONENT' && v.children?.length),
        brands: [...new Set(node.children.map(v => variantProps(v.name).Brand).filter(Boolean))],
      });
      return;
    }
    node.children?.forEach(child => visit(child, section));
  };
  visit(page, undefined);
  return sets;
}

/** Things a designer should fix in Figma, in plain words. */
export function checkSet(set, meta) {
  const issues = [];
  if (!meta.code.length && !/figma only/i.test(set.description))
    issues.push(`**${set.name}** has no \`Code:\` line in its description`);
  if (set.brands.length) {
    const missing = BRANDS.filter(b => !set.brands.includes(b));
    if (missing.length) issues.push(`**${set.name}** is missing a variant for ${missing.join(', ')}`);
  }
  if (!set.variants.length) issues.push(`**${set.name}** has no artwork yet (all variants are empty)`);
  return issues;
}

/** Current files in icons/ (path → content), to tell what changed. */
function snapshot() {
  const files = new Map();
  if (!existsSync(OUT)) return files;
  for (const rel of readdirSync(OUT, { recursive: true }))
    if (String(rel).endsWith('.svg')) files.set(String(rel), readFileSync(new URL(String(rel), OUT), 'utf8'));
  return files;
}

export function summarise({ sets, files, before, oldNames, issues }) {
  const label = f =>
    [
      f.set.name,
      Object.values(f.props)
        .filter(v => v !== 'Light')
        .join(' · '),
    ]
      .filter(Boolean)
      .join(' — ');
  const added = [],
    changed = [];
  for (const f of files.filter(f => !f.skipped)) {
    const old = before.get(f.file);
    if (old === undefined) added.push(label(f));
    else if (old !== readFileSync(new URL(f.file, OUT), 'utf8')) changed.push(label(f));
  }
  const names = new Set(sets.map(s => s.name));
  const removed = [...oldNames].filter(n => !names.has(n));
  const kept = new Set(files.map(f => f.file));
  const removedFiles = [...before.keys()].filter(f => !kept.has(f));
  const list = (title, items) =>
    items.length ? `### ${title} (${items.length})\n${items.map(i => `- ${i}`).join('\n')}\n` : '';
  const body = [
    '## Icons exported from Figma',
    'From the DS-Foundation file, **Icons & Images** page. Check the SVG diff and the Storybook **Icons** page, then merge.',
    '',
    list('✅ Added', added),
    list('✏️ Changed', changed),
    list('🗑 Removed icons', removed),
    removedFiles.length && !removed.length ? list('🗑 Removed files', removedFiles) : '',
    issues.length
      ? list('⚠️ Please fix in Figma', issues)
      : '### ⚠️ Please fix in Figma\nNothing – all icons follow the rules.\n',
  ].join('\n');
  return { body, hasChanges: added.length + changed.length + removed.length + removedFiles.length > 0 };
}

async function main() {
  if (!TOKEN) throw new Error('Set FIGMA_TOKEN (a Figma personal access token with file read access).');

  console.log('Reading Figma page…');
  const { nodes } = await figma(`/files/${FILE_KEY}/nodes?ids=${encodeURIComponent(PAGE_ID)}`);
  const pageNode = nodes[PAGE_ID];
  const sets = collectSets(pageNode.document, pageNode.componentSets ?? {});
  const variableNames = modesVariableNames();

  // File name per variant: <code name or set name>[-<extra props>], under the brand folder.
  const files = [];
  const taken = new Set();
  const issues = [];
  for (const set of sets) {
    const meta = parseDescription(set.description);
    issues.push(...checkSet(set, meta));
    const setBase = kebab(meta.code[0] ?? set.name.replace(/\//g, ' '));
    // Merged sets (e.g. Chevron) map one property's values to their own code names.
    const mappedKey = set.variants
      .flatMap(v => Object.entries(variantProps(v.name)))
      .find(([, value]) => meta.codeFor[value])?.[0];
    for (const variant of set.variants) {
      const props = variantProps(variant.name);
      const brand = props.Brand ? kebab(props.Brand) : 'shared';
      const mapped = mappedKey && props[mappedKey];
      const base = !mapped ? setBase : kebab(meta.codeFor[mapped] ?? `${set.name.replace(/\//g, ' ')} ${mapped}`); // e.g. chevron-left
      const extra = Object.entries(props)
        .filter(([k, v]) => k !== 'Brand' && k !== mappedKey && !(k === 'Theme' && v === 'Light'))
        .map(([, v]) => kebab(v));
      let file = `${brand}/${[base, ...extra].join('-')}.svg`;
      if (taken.has(file)) {
        issues.push(`**${set.name}** has the same code name as another icon (\`${file}\`)`);
        file = `${brand}/${[base, kebab(set.section ?? ''), ...extra].join('-')}.svg`;
      }
      taken.add(file);
      files.push({ set, meta, variant, props, brand, file, colour: colouring(variant) });
    }
  }

  console.log(`Exporting ${files.length} SVGs from ${sets.length} sets…`);
  const urls = {};
  for (let i = 0; i < files.length; i += 100) {
    const ids = files.slice(i, i + 100).map(f => f.variant.id);
    const { images } = await figma(
      `/images/${FILE_KEY}?format=svg&svg_include_id=false&svg_simplify_stroke=true&ids=${ids.map(encodeURIComponent).join(',')}`,
    );
    Object.assign(urls, images);
  }

  const before = snapshot();
  const oldNames = new Set(
    existsSync(new URL('icons.json', OUT))
      ? JSON.parse(readFileSync(new URL('icons.json', OUT), 'utf8')).map(i => i.name)
      : [],
  );
  rmSync(OUT, { recursive: true, force: true });
  const queue = [...files];
  const worker = async () => {
    for (let f; (f = queue.shift());) {
      const url = urls[f.variant.id];
      if (!url) {
        console.warn(`  no render for ${f.set.name} / ${f.variant.name}`);
        f.skipped = true;
        continue;
      }
      let svg = await (await fetch(url)).text();
      if (f.colour.mode === 'currentColor') svg = toCurrentColor(svg);
      mkdirSync(new URL(f.brand + '/', OUT), { recursive: true });
      writeFileSync(new URL(f.file, OUT), optimise(svg));
    }
  };
  await Promise.all(Array.from({ length: 8 }, worker));

  const manifest = sets
    .map(set => {
      const own = files.filter(f => f.set === set && !f.skipped);
      if (!own.length) return null;
      const meta = own[0].meta;
      const variable = own.map(f => f.colour.variableId).find(Boolean);
      const variableName = variable && variableNames.get(variable);
      return {
        name: set.name,
        section: set.section,
        code: meta.code,
        aliases: meta.aliases,
        ...(meta.note && { note: meta.note }),
        ...(variableName && { color: { figma: variableName, css: cssVarFor(variableName) } }),
        files: own.map(f => ({ ...f.props, file: f.file })),
      };
    })
    .filter(Boolean)
    .sort((a, b) => (a.section ?? '').localeCompare(b.section ?? '') || a.name.localeCompare(b.name));

  writeFileSync(new URL('icons.json', OUT), JSON.stringify(manifest, null, 2) + '\n');
  const { body, hasChanges } = summarise({ sets, files, before, oldNames, issues });
  if (process.env.ICONS_SUMMARY) writeFileSync(process.env.ICONS_SUMMARY, body);
  console.log(body);
  console.log(
    `Done: ${manifest.length} icons, ${files.filter(f => !f.skipped).length} SVG files in icons/.${hasChanges ? '' : ' No changes.'}`,
  );
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(err => {
    console.error(err.message);
    process.exit(1);
  });
}
