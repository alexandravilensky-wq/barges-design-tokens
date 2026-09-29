import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import brands from '../build/brands.json';
import {
  Empty,
  Page,
  Section,
  Swatch,
  Table,
  byPrefix,
  cell,
  mono,
  muted,
  tokensFor,
  valueFor,
  type Token,
} from './tokens';

const meta: Meta = { title: 'Tokens/Colors' };
export default meta;
type Story = StoryObj;

/** Primitive → the semantic colors that resolve to it in this theme (following alias chains). */
function usageByPrimitive(tokens: Token[], theme: string) {
  const byName = new Map(tokens.map(t => [t.name, t]));
  const usage = new Map<string, string[]>();
  for (const t of tokens) {
    if (!t.name.startsWith('--color-')) continue;
    let ref = valueFor(t, theme)?.ref;
    for (let hops = 0; ref?.startsWith('--color-') && hops < 10; hops++) {
      const next = byName.get(ref);
      ref = next && valueFor(next, theme)?.ref;
    }
    if (ref?.startsWith('--primitive-')) usage.set(ref, [...(usage.get(ref) ?? []), t.name]);
  }
  return usage;
}

const groupOf = (semantic: string) => semantic.split('-')[3];

/** `--color-button-primary-default` → ["Button", "Primary default"]. */
function describeSemantic(name: string) {
  const [, , , group, ...rest] = name.split('-');
  const detail = rest.join(' ');
  return [group[0].toUpperCase() + group.slice(1), detail[0]?.toUpperCase() + detail.slice(1)];
}

interface Hover {
  primitive: string;
  hex: string;
  rect: DOMRect;
}

function Tooltip({
  hover,
  uses,
  highlight,
  theme,
}: {
  hover: Hover;
  uses: string[];
  highlight: string[];
  theme: string;
}) {
  const width = 280;
  const { rect } = hover;
  const below = rect.top < 240;
  const left = Math.min(Math.max(rect.left + rect.width / 2 - width / 2, 8), window.innerWidth - width - 8);
  return (
    <div
      role="tooltip"
      style={{
        position: 'fixed',
        left,
        top: below ? rect.bottom + 10 : rect.top - 10,
        transform: below ? undefined : 'translateY(-100%)',
        width,
        boxSizing: 'border-box',
        zIndex: 10,
        pointerEvents: 'none',
        padding: 16,
        borderRadius: 16,
        display: 'grid',
        gap: 12,
        // Inverted surface so it reads in both themes.
        background: 'var(--color-text-primary)',
        color: 'var(--color-background-primary)',
        boxShadow: '0 12px 32px rgba(0, 0, 0, 0.25)',
        fontSize: 13,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            flexShrink: 0,
            background: `var(${hover.primitive})`,
            boxShadow: 'inset 0 0 0 1px rgba(128, 128, 128, 0.35)',
          }}
        />
        <div style={{ display: 'grid' }}>
          <span style={{ fontWeight: 600 }}>{hover.primitive.replace('--primitive-', '')}</span>
          <span style={{ ...mono, opacity: 0.7 }}>{hover.hex}</span>
        </div>
      </div>
      <div style={{ display: 'grid', gap: 6 }}>
        <span style={{ opacity: 0.7 }}>
          {uses.length ? `Used in ${theme} mode for` : `Not used by any semantic color in ${theme} mode.`}
        </span>
        {uses.map((name, i) => {
          const [group, detail] = describeSemantic(name);
          const repeat = i > 0 && describeSemantic(uses[i - 1])[0] === group;
          const dim = highlight.length > 0 && !highlight.includes(groupOf(name));
          return (
            <div key={name} style={{ display: 'flex', gap: 8, opacity: dim ? 0.45 : 1 }}>
              <span style={{ fontWeight: 600, minWidth: 80, visibility: repeat ? 'hidden' : undefined }}>{group}</span>
              <span>{detail}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Segmented({ options, value, onChange }: { options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <div
        role="tablist"
        style={{
          display: 'inline-flex',
          gap: 4,
          padding: 4,
          borderRadius: 999,
          background: 'var(--color-background-secondary)',
        }}
      >
        {options.map(option => {
          const active = option === value;
          return (
            <button
              key={option}
              role="tab"
              aria-selected={active}
              onClick={() => onChange(option)}
              style={{
                font: 'inherit',
                fontSize: 14,
                whiteSpace: 'nowrap',
                padding: '10px 24px',
                borderRadius: 999,
                border: 0,
                cursor: 'pointer',
                background: active ? 'var(--color-background-primary)' : 'transparent',
                color: active ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                boxShadow: active ? '0 1px 3px rgba(0, 0, 0, 0.12)' : 'none',
                transition: 'background 150ms, color 150ms',
              }}
            >
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
}

const FAMILY_ORDER = ['neutral', 'primary', 'secondary', 'tertiary', 'red', 'orange', 'green', 'yellow', 'blue'];

/** How each step range is meant to be used, per theme. */
const STEP_GROUPS: { steps: string[]; label: string; themes: ('light' | 'dark')[] }[] = [
  { steps: ['100'], label: 'Background', themes: ['light'] },
  { steps: ['200', '300'], label: 'Background & Background Accent', themes: ['light'] },
  { steps: ['400', '500', '600', '700'], label: 'Only with on-[…] texts', themes: ['light', 'dark'] },
  { steps: ['800', '900'], label: 'Background & Background Accent', themes: ['dark'] },
];

const icon = {
  width: 20,
  height: 20,
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round',
} as const;
const Sun = () => (
  <svg viewBox="0 0 24 24" {...icon} aria-label="Light mode">
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </svg>
);
const Moon = () => (
  <svg viewBox="0 0 24 24" {...icon} aria-label="Dark mode">
    <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z" />
  </svg>
);

export const Primitives: Story = {
  render: (_, { globals }) => {
    const [usage, setUsage] = useState('All');
    const [hover, setHover] = useState<Hover | null>(null);
    const tokens = tokensFor(globals.brand);
    const primitives = byPrefix(tokens, '--primitive-');
    if (!primitives.length) return <Empty />;
    const present = [...new Set(primitives.map(t => t.name.split('-')[3]))];
    const families = [
      ...FAMILY_ORDER.filter(f => present.includes(f)),
      ...present.filter(f => !FAMILY_ORDER.includes(f)),
    ];
    const brandName = brands[globals.brand as keyof typeof brands] ?? globals.brand;
    const columns = `minmax(160px, 1.6fr) repeat(${families.length}, minmax(48px, 1fr)) 48px`;
    const theme = globals.theme === 'dark' ? 'dark' : 'light';
    const usedBy = usageByPrimitive(tokens, theme);
    // Toggle segments are the Figma semantic groups (--color-<group>-…) that point at primitives.
    const semanticGroups = [...new Set(byPrefix(tokens, '--color-').map(t => groupOf(t.name)))].filter(g =>
      [...usedBy.values()].some(names => names.some(n => groupOf(n) === g)),
    );
    const segments = [
      { label: 'All', groups: [] as string[] },
      { label: 'All used', groups: semanticGroups },
      ...semanticGroups.map(g => ({ label: g[0].toUpperCase() + g.slice(1), groups: [g] })),
    ];
    const groups = segments.find(u => u.label === usage)?.groups ?? [];
    const used = groups.length
      ? new Set([...usedBy].filter(([, names]) => names.some(n => groups.includes(groupOf(n)))).map(([p]) => p))
      : null;
    const hex = (family: string, step: string) =>
      String(primitives.find(t => t.name === `--primitive-${family}-${step}`)?.values.any.value ?? '');

    return (
      <Page>
        <h2 style={{ margin: 0, fontSize: 28, fontFamily: 'var(--font-family-title), system-ui' }}>{brandName}</h2>
        <div style={{ display: 'grid', gap: 8 }}>
          <Segmented options={segments.map(u => u.label)} value={usage} onChange={setUsage} />
          {used && (
            <span style={muted}>
              {used.size} of {primitives.length} primitives are used{' '}
              {usage === 'All used' ? 'by semantic colors' : `for ${usage}`} in {theme} mode.
            </span>
          )}
        </div>
        <div style={{ overflowX: 'auto' }}>
          <div style={{ minWidth: 720, display: 'grid', gap: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: columns, gap: 12 }}>
              <span />
              {families.map(f => (
                <span key={f} style={{ textAlign: 'center', fontSize: 14, color: 'var(--color-text-secondary)' }}>
                  {f[0].toUpperCase() + f.slice(1)}
                </span>
              ))}
              <span />
            </div>
            {STEP_GROUPS.map((group, g) => (
              <div
                key={group.steps[0]}
                style={{
                  display: 'grid',
                  gridTemplateColumns: columns,
                  gap: 12,
                  paddingTop: g ? 12 : 0,
                  borderTop: g ? '1px solid var(--color-border-primary)' : undefined,
                }}
              >
                <div
                  style={{
                    gridRow: `1 / span ${group.steps.length}`,
                    display: 'grid',
                    gap: 8,
                    alignContent: 'start',
                    paddingTop: 16,
                    fontSize: 14,
                    color: 'var(--color-text-secondary)',
                  }}
                >
                  <span style={{ display: 'flex', gap: 12, color: 'var(--color-text-primary)' }}>
                    {group.themes.includes('light') && <Sun />}
                    {group.themes.includes('dark') && <Moon />}
                  </span>
                  <span style={{ maxWidth: 160 }}>{group.label}</span>
                </div>
                {group.steps.map((step, row) => [
                  ...families.map(f => (
                    <div
                      key={`${f}-${step}`}
                      tabIndex={0}
                      aria-label={`${f} ${step}, ${hex(f, step)}`}
                      onMouseEnter={e =>
                        setHover({
                          primitive: `--primitive-${f}-${step}`,
                          hex: hex(f, step),
                          rect: e.currentTarget.getBoundingClientRect(),
                        })
                      }
                      onFocus={e =>
                        setHover({
                          primitive: `--primitive-${f}-${step}`,
                          hex: hex(f, step),
                          rect: e.currentTarget.getBoundingClientRect(),
                        })
                      }
                      onMouseLeave={() => setHover(null)}
                      onBlur={() => setHover(null)}
                      style={{
                        cursor: 'default',
                        outlineOffset: 2,
                        gridRow: row + 1,
                        aspectRatio: '1',
                        borderRadius: 8,
                        background: `var(--primitive-${f}-${step})`,
                        boxShadow: 'inset 0 0 0 1px rgba(0, 0, 0, 0.04)',
                        opacity: !used || used.has(`--primitive-${f}-${step}`) ? 1 : 0.12,
                        transition: 'opacity 200ms',
                      }}
                    />
                  )),
                  <span
                    key={`label-${step}`}
                    style={{
                      gridRow: row + 1,
                      alignSelf: 'center',
                      fontSize: 14,
                      color: 'var(--color-text-secondary)',
                    }}
                  >
                    {step}
                  </span>,
                ])}
              </div>
            ))}
          </div>
        </div>
        <p style={{ ...muted, margin: 0 }}>Hover a swatch to see where it's used.</p>
        {hover && <Tooltip hover={hover} uses={usedBy.get(hover.primitive) ?? []} highlight={groups} theme={theme} />}
      </Page>
    );
  },
};

export const Semantic: Story = {
  render: (_, { globals }) => {
    const colors = byPrefix(tokensFor(globals.brand), '--color-');
    if (!colors.length) return <Empty />;
    const groups = [...new Set(colors.map(t => t.name.split('-')[3]))];
    return (
      <Page>
        {groups.map(group => (
          <Section
            key={group}
            title={group[0].toUpperCase() + group.slice(1)}
            subtitle="Swatches follow the Brand and Theme toolbar."
          >
            <Table head={['', 'Token', 'Value', 'Alias of', 'Usage']}>
              {byPrefix(colors, `--color-${group}-`).map(t => {
                const v = valueFor(t, globals.theme);
                return (
                  <tr key={t.name}>
                    <td style={{ ...cell, width: 48 }}>
                      <Swatch cssVar={t.name} />
                    </td>
                    <td style={{ ...cell, ...mono }}>{t.name}</td>
                    <td style={{ ...cell, ...mono }}>{String(v?.value ?? '—')}</td>
                    <td style={{ ...cell, ...mono, ...muted }}>
                      {v?.unresolvedAlias ? (
                        <span style={{ color: 'var(--color-states-warning)' }} title={v.unresolvedAlias}>
                          unresolved in Figma
                        </span>
                      ) : (
                        (v?.ref ?? '—')
                      )}
                    </td>
                    <td style={{ ...cell, ...muted, maxWidth: 380 }}>{t.description}</td>
                  </tr>
                );
              })}
            </Table>
          </Section>
        ))}
      </Page>
    );
  },
};
