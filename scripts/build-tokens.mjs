/**
 * Figma export (tokens/*.json) → Style Dictionary → one CSS file per brand.
 *
 *   build/css/<brand>.css   :root = light, [data-theme="dark"] = dark,
 *                           responsive font sizes via media queries,
 *                           .text-* classes for the Figma text styles
 *   build/json/<brand>.json token list used by the Storybook docs
 *
 * Aliases stay as var() references, so --color-button-primary-default
 * points at --primitive-primary-600 just like in Figma.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import StyleDictionary from 'style-dictionary';

const root = new URL('..', import.meta.url);
const read = path => readFileSync(new URL(path, root), 'utf8');

/** figma-modes.json is two JSON documents back to back; the others are one. */
function parseDocuments(raw) {
  const docs = [];
  let depth = 0;
  let start = -1;
  let inString = false;
  for (let i = 0; i < raw.length; i++) {
    const c = raw[i];
    if (inString) {
      if (c === '\\') i++;
      else if (c === '"') inString = false;
    } else if (c === '"') inString = true;
    else if (c === '{' && depth++ === 0) start = i;
    else if (c === '}' && --depth === 0) docs.push(JSON.parse(raw.slice(start, i + 1)));
  }
  return docs;
}
const json = file => parseDocuments(read(`tokens/${file}`))[0];

const brandFile = json('figma-brand.json');
const breakpointFile = json('figma-breakpoint.json');
const fallbacks = JSON.parse(read('config/unresolved-fallbacks.json'));

export const BRANDS = {
  'purple-garden': 'Purple Garden',
  kasamba: 'Kasamba',
  psiquicos: 'Psiquicos',
  'purple-ocean': 'Purple Ocean',
};

const [MOBILE, TABLET, DESKTOP] = Object.keys(breakpointFile);
const MEDIA = { [TABLET]: '(min-width: 768px)', [DESKTOP]: '(min-width: 1024px)' };

const WEIGHTS = { regular: 400, medium: 500, semibold: 600, 'semi bold': 600, bold: 700 };
const ENTITIES = { '&quot;': '"', '&#39;': "'", '&amp;': '&', '&lt;': '<', '&gt;': '>' };
const decode = s => s?.replace(/&(quot|#39|amp|lt|gt);/g, m => ENTITIES[m]);
const kebab = s =>
  String(s)
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();

// ─── Pre-processing ──────────────────────────────────────────────────────────

const warnings = [];

/** Replace `{unresolved:VariableID:…}` with the fallback from config, or drop the token. */
function patchUnresolved(node, path = []) {
  if (node && typeof node === 'object' && '$value' in node) {
    const id = typeof node.$value === 'string' && node.$value.match(/^\{unresolved:(.+)\}$/)?.[1];
    if (!id) return node;
    const fallback = fallbacks[id];
    warnings.push(`${path.join('/')}: Figma alias ${id} is unresolved → ${fallback ? fallback.value : 'dropped'}`);
    return fallback ? { ...node, $value: fallback.value, $extensions: { unresolvedAlias: id } } : undefined;
  }
  if (!node || typeof node !== 'object') return node;
  return Object.fromEntries(
    Object.entries(node)
      .map(([k, v]) => [k, k.startsWith('$') ? v : patchUnresolved(v, [...path, k])])
      .filter(([, v]) => v !== undefined),
  );
}

// ─── Naming ──────────────────────────────────────────────────────────────────

const MODE_SEGMENT = /^(light|dark)( mode)?$/i;
const MODE_SUFFIX = /(Light|Dark)$/;

/** Figma encodes light/dark as a path segment or a name suffix; normalise both. */
function splitMode(path) {
  const i = path.findIndex(p => MODE_SEGMENT.test(p));
  if (i >= 0) return { path: path.filter((_, j) => j !== i), mode: /^light/i.test(path[i]) ? 'light' : 'dark' };
  const last = path.at(-1);
  const suffix = last.match(MODE_SUFFIX)?.[1];
  if (suffix && last.length > suffix.length) {
    return { path: [...path.slice(0, -1), last.slice(0, -suffix.length)], mode: suffix.toLowerCase() };
  }
  return { path, mode: 'any' };
}

/** Token path → CSS custom property name (without `--`) and theme mode. */
function describe(path) {
  const [collection, ...rest] = path;
  if (collection === 'Brand') {
    const [layer, kind, ...tail] = rest;
    if (layer === 'primitives' && kind === 'color') return { name: ['primitive', ...tail], mode: 'any' };
    if (layer === 'primitives' && kind === 'typography') {
      const [group, key] = tail;
      return { name: [`font-${group}`, key === 'ttile' ? 'title' : key], mode: 'any' };
    }
    const { path: clean, mode } = splitMode(rest.slice(1)); // drop "semantic"
    if (clean[0] === 'radius') return { name: ['radius', clean[1]], mode };
    return { name: clean, mode };
  }
  if (collection === 'Breakpoint') return { name: ['font-size', rest.at(-1)], mode: 'any' };
  if (collection in MEDIA) return { name: ['font-size', rest.at(-1)], mode: collection };
  if (collection === 'textStyles') return { name: ['text', rest.at(-1)], mode: 'any' };
  return { name: rest, mode: 'any' }; // grid-*, radius-*
}

StyleDictionary.registerTransform({
  name: 'barges/name',
  type: 'name',
  transform: token => describe(token.path).name.map(kebab).join('-'),
});

// ─── Output ──────────────────────────────────────────────────────────────────

const px = n => (n === 0 ? '0' : `${n}px`);

function cssValue(token, byPath) {
  const original = token.original.$value;
  // Keep aliases as var() so the CSS mirrors Figma's structure.
  const ref = typeof original === 'string' && original.match(/^\{([^}]+)\}$/)?.[1];
  if (ref) {
    const target = byPath.get(ref);
    if (target) return `var(--${target.name})`;
  }
  const value = token.$value;
  if (token.$type === 'number') return px(value);
  if (token.$type === 'string' && token.path.includes('weight')) return String(WEIGHTS[value.toLowerCase()] ?? 400);
  if (token.$type === 'string' && token.path.includes('family')) return `'${value}'`;
  return String(value);
}

/** Text style name (e.g. `Body-Large-Emphasis`) → the semantic tokens it's built from. */
function textStyleRule(token, names) {
  const [category, size, variant] = token.path.at(-1).split('-');
  const { fontFamily, fontSize, letterSpacing } = token.$value;
  const sizeVar = [...names].find(n => n === `typography-${kebab(category)}-${kebab(size)}`);
  const familyKey = category.toLowerCase() === 'title' ? 'title' : category.toLowerCase();
  const weight = variant === 'Emphasis' ? 'emphasis' : 'regular';
  return [
    `.${token.name} {`,
    `  font-family: var(--font-family-${familyKey}, '${fontFamily}'), system-ui, sans-serif;`,
    `  font-weight: var(--font-weight-${weight});`,
    `  font-size: ${sizeVar ? `var(--${sizeVar}, ${px(fontSize)})` : px(fontSize)};`,
    `  line-height: 1.2;`,
    `  letter-spacing: ${(letterSpacing?.value ?? 0) / 100}em;`,
    `}`,
  ].join('\n');
}

StyleDictionary.registerFormat({
  name: 'barges/css-themed',
  format: ({ dictionary, options }) => {
    const byPath = new Map(dictionary.allTokens.map(t => [t.path.join('.'), t]));
    const names = new Set(dictionary.allTokens.map(t => t.name));
    const blocks = { any: [], light: [], dark: [], [TABLET]: [], [DESKTOP]: [] };
    const textStyles = [];
    const seen = new Set();

    for (const token of dictionary.allTokens) {
      if (token.path[0] === 'textStyles') {
        textStyles.push(textStyleRule(token, names));
        continue;
      }
      const { mode } = describe(token.path);
      // Same name is expected across modes/breakpoints, never within one.
      const key = `${mode}:${token.name}`;
      if (seen.has(key)) throw new Error(`Two tokens map to --${token.name} (${mode}): ${token.path.join('/')}`);
      seen.add(key);
      blocks[mode]?.push(`  --${token.name}: ${cssValue(token, byPath)};`);
    }

    const block = (selector, lines, indent = '') =>
      lines.length ? `${indent}${selector} {\n${lines.map(l => indent + l).join('\n')}\n${indent}}` : '';

    return [
      `/* ${options.brand} — generated by scripts/build-tokens.mjs from the Figma export. Do not edit. */`,
      block(':root', [...blocks.any, ...blocks.light]),
      block(':root[data-theme="dark"]', blocks.dark),
      ...[TABLET, DESKTOP].map(bp => `@media ${MEDIA[bp]} {\n${block(':root', blocks[bp], '  ')}\n}`),
      ...textStyles,
      '',
    ].join('\n\n');
  },
});

StyleDictionary.registerFormat({
  name: 'barges/docs-json',
  format: ({ dictionary }) => {
    const byPath = new Map(dictionary.allTokens.map(t => [t.path.join('.'), t]));
    const tokens = {};
    for (const token of dictionary.allTokens) {
      const { mode } = describe(token.path);
      const entry = (tokens[token.name] ??= {
        name: `--${token.name}`,
        group: token.path[0] === 'Brand' ? describe(token.path).name[0] : token.path[0],
        type: token.$type,
        description: decode(token.$description),
        values: {},
      });
      const ref = token.original.$value?.match?.(/^\{([^}]+)\}$/)?.[1];
      entry.values[mode] = {
        value: token.$value,
        ref: ref && byPath.get(ref) ? `--${byPath.get(ref).name}` : undefined,
        unresolvedAlias: token.$extensions?.unresolvedAlias,
      };
      if (mode === 'light' || !entry.description) entry.description = decode(token.$description);
    }
    return JSON.stringify(Object.values(tokens), null, 2);
  },
});

// ─── Build ───────────────────────────────────────────────────────────────────

for (const [slug, brand] of Object.entries(BRANDS)) {
  const { ['Brand tag']: _tag, ...brandTokens } = patchUnresolved(brandFile[brand], [brand]);
  const sd = new StyleDictionary({
    usesDtcg: true,
    // Name "collisions" are intentional (light/dark and breakpoints share a
    // name); the format above fails on real duplicates instead.
    log: { verbosity: 'default', warnings: 'disabled' },
    tokens: {
      Brand: brandTokens,
      // Semantic typography aliases point at `Breakpoint.*`; mobile is the
      // base, tablet/desktop are emitted inside media queries.
      Breakpoint: breakpointFile[MOBILE],
      [TABLET]: breakpointFile[TABLET],
      [DESKTOP]: breakpointFile[DESKTOP],
      grid: json('figma-grid.json'),
      radius: json('figma-radius.json'),
      textStyles: json('text-styles.json'),
    },
    platforms: {
      css: {
        transforms: ['barges/name'],
        buildPath: 'build/',
        options: { brand },
        files: [
          { destination: `css/${slug}.css`, format: 'barges/css-themed' },
          { destination: `json/${slug}.json`, format: 'barges/docs-json' },
        ],
      },
    },
  });
  await sd.buildAllPlatforms();
}

// Brand list for Storybook's toolbar.
mkdirSync(new URL('build/', root), { recursive: true });
writeFileSync(new URL('build/brands.json', root), JSON.stringify(BRANDS, null, 2));

if (warnings.length) {
  console.warn(`\n⚠️  ${warnings.length} unresolved Figma aliases (see config/unresolved-fallbacks.json):`);
  for (const w of warnings) console.warn('   ' + w);
}
