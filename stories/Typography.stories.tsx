import type { ReactNode } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  BREAKPOINT_NAMES,
  ON_BRAND_TEXT,
  Empty,
  Page,
  Section,
  Table,
  byPrefix,
  cell,
  mono,
  muted,
  tokensFor,
  useBreakpoint,
  type Token,
} from './tokens';

const meta: Meta = { title: 'Tokens/Typography' };
export default meta;
type Story = StoryObj;

const TABLET = 'Tablet (768-1023)';
const DESKTOP = 'Desktop (≥1024)';

const familyOf = (tokens: Token[], role: string) =>
  String(tokens.find(t => t.name === `--font-family-${role}`)?.values.any.value ?? '');

/** Size in px at the given breakpoint (0 mobile, 1 tablet, 2 desktop) for a category/size pair. */
function sizeAt(tokens: Token[], category: string, size: string, bp: number) {
  const find = (name: string) => tokens.find(t => t.name === name);
  const step = find(find(`--typography-${category}-${size}`)?.values.any.ref ?? '');
  return step ? String((step.values[['any', TABLET, DESKTOP][bp]] ?? step.values.any).value) : '—';
}

const EXAMPLE = [
  { style: 'text-display-large-emphasis', role: 'Display', use: 'display' },
  { style: 'text-title-medium-emphasis', role: 'Titles', use: 'titles' },
  { style: 'text-subtitle-large-regular', role: 'Subtitles', use: 'subtitles' },
  { style: 'text-body-large-regular', role: 'Body', use: 'body copy' },
  {
    style: 'text-caption-large-regular',
    role: 'Captions',
    use: 'captions and disclaimers',
  },
];

const LEVELS = [
  {
    role: 'Display',
    style: 'text-display-large-emphasis',
    text: 'Find clarity today',
  },
  {
    role: 'Title',
    style: 'text-title-large-emphasis',
    text: 'Guidance from trusted advisors.',
  },
  {
    role: 'Subtitle',
    style: 'text-subtitle-large-regular',
    text: 'Connect by chat, call or video.',
  },
  {
    role: 'Body',
    style: 'text-body-large-regular',
    text: 'Every advisor is screened before joining. Ask your question and only pay for the minutes you use.',
  },
  {
    role: 'Caption',
    style: 'text-caption-large-regular',
    text: '4.9 ★ · 12,400 readings · Online now',
  },
];

function Pill({ children }: { children: ReactNode }) {
  return (
    <span
      style={{
        fontSize: 14,
        padding: '6px 14px',
        borderRadius: 999,
        background: 'var(--color-background-primary)',
        color: 'var(--color-text-primary)',
      }}
    >
      {children}
    </span>
  );
}

export const Hierarchy: Story = {
  render: (_, { globals }) => {
    const tokens = tokensFor(globals.brand);
    const bp = useBreakpoint();
    if (!byPrefix(tokens, '--text-').length) return <Empty />;
    const weightName = (variant: string) =>
      String(
        tokens.find(t => t.name === `--font-weight-${variant === 'emphasis' ? 'emphasis' : 'regular'}`)?.values.any
          .value ?? '',
      );

    return (
      <Page>
        <Section
          title="Hierarchy"
          subtitle="Steps in size and weight show readers what matters most and in what order to read."
        >
          <div
            className="ds-panel"
            style={{
              borderRadius: 'var(--radius-16)',
              background: 'var(--color-background-secondary)',
            }}
          >
            {EXAMPLE.map((e, i) => {
              const [, category, , variant] = e.style.split('-');
              return (
                <div
                  key={e.style}
                  className="ds-row"
                  style={{
                    borderTop: i ? '1px solid var(--color-border-primary)' : undefined,
                  }}
                >
                  <span style={{ fontSize: 14 }}>{e.role}</span>
                  <div className={e.style} style={{ maxWidth: i < 2 ? '16ch' : '36ch' }}>
                    We use {familyOf(tokens, category)} {weightName(variant)} for {e.use}.
                    {e.role === 'Captions' && (
                      <>
                        {' '}
                        Sometimes they have <u>links</u>.
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Section>

        <Section title="Levels">
          <div className="ds-cards">
            {LEVELS.map(level => {
              const [, category, size, variant] = level.style.split('-');
              const style = tokens.find(t => t.name === `--${level.style}`);
              const spec = style?.values.any.value as { letterSpacing?: { value?: number } } | undefined;
              const rows: [string, ReactNode][] = [
                ['Font', familyOf(tokens, category)],
                ['Weight', weightName(variant)],
                ['Type size', `${sizeAt(tokens, category, size, bp)}px`],
                ['Letter spacing', `${spec?.letterSpacing?.value ?? 0}%`],
                ['Line height', <span title="Figma: Auto. The generated CSS uses 120%.">Auto</span>],
              ];
              return (
                <div
                  key={level.role}
                  style={{
                    display: 'grid',
                    gridTemplateRows: 'auto 1fr auto',
                    gap: 16,
                    padding: 24,
                    borderRadius: 24,
                    background: 'var(--color-background-secondary)',
                  }}
                >
                  <span style={{ fontSize: 14, fontWeight: 600 }}>{level.role}</span>
                  <div className={level.style} style={{ overflowWrap: 'anywhere', minHeight: 140 }}>
                    {level.text}
                  </div>
                  <div>
                    {rows.map(([name, value]) => (
                      <div
                        key={name}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '8px 0',
                          borderTop: '1px solid var(--color-border-primary)',
                          fontSize: 14,
                        }}
                      >
                        <span>{name}</span>
                        <Pill>{value}</Pill>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </Section>
      </Page>
    );
  },
};

// ─── In use ──────────────────────────────────────────────────────────────────

/** Numbered marker with a leader line, pointing at the element it wraps. */
function Callout({
  n,
  children,
  tone = 'var(--color-text-secondary)',
  side = 'left',
}: {
  n: number;
  children: ReactNode;
  tone?: string;
  side?: 'left' | 'right';
}) {
  return (
    <div style={{ position: 'relative' }}>
      <div
        aria-hidden
        className="ds-marker"
        style={{
          position: 'absolute',
          ...(side === 'left' ? { right: '100%', marginRight: 8 } : { left: '100%', marginLeft: 8 }),
          top: '0.6em',
          display: 'flex',
          flexDirection: side === 'left' ? 'row' : 'row-reverse',
          alignItems: 'center',
          color: tone,
        }}
      >
        <span
          style={{
            width: 22,
            height: 22,
            borderRadius: 999,
            border: '1px solid currentColor',
            fontSize: 12,
            display: 'grid',
            placeItems: 'center',
            fontFamily: 'var(--font-family-body), system-ui',
          }}
        >
          {n}
        </span>
        <span
          style={{
            width: 28,
            height: 1,
            background: 'currentColor',
          }}
        />
      </div>
      {children}
    </div>
  );
}

/** Grey stage holding a white app surface, cropped like a screenshot. */
function Stage({ children, width = 340 }: { children: ReactNode; width?: number }) {
  return (
    <div
      className="ds-stage"
      style={{
        height: 300,
        overflow: 'hidden',
        borderRadius: 24,
        background: 'var(--color-background-secondary)',
        display: 'grid',
        placeItems: 'center',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: width,
          display: 'grid',
          gap: 12,
          padding: 20,
          borderRadius: 16,
          background: 'var(--color-background-primary)',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.06)',
        }}
      >
        {children}
      </div>
    </div>
  );
}

function PrimaryButton({ children, wide }: { children: ReactNode; wide?: boolean }) {
  return (
    <span
      className="text-caption-medium-emphasis"
      style={{
        justifySelf: wide ? 'stretch' : 'start',
        textAlign: 'center',
        padding: '10px 20px',
        borderRadius: 'var(--radius-button)',
        background: 'var(--color-button-primary-default)',
        color: `var(${ON_BRAND_TEXT})`,
      }}
    >
      {children}
    </span>
  );
}

const secondary = { color: 'var(--color-text-secondary)' };

const OVERVIEW_LEGEND = ['Display', 'Title', 'Subtitle', 'Button', 'Caption'];

/** A promo banner with every level numbered, plus the legend. */
function Overview() {
  const on = `var(${ON_BRAND_TEXT})`;
  const tiles = ['Love', 'Tarot', 'Career'];
  return (
    <div style={{ display: 'grid', gap: 32, marginBottom: 24 }}>
      <div className="ds-banner" style={{ borderRadius: 24, background: 'var(--color-branding-primary)', color: on }}>
        <div style={{ display: 'grid', gap: 16, justifyItems: 'start' }}>
          <Callout n={5} tone={on}>
            <span className="text-caption-small-emphasis">3 free minutes</span>
          </Callout>
          <Callout n={1} tone={on}>
            <div className="text-display-small-emphasis">Find your psychic advisor</div>
          </Callout>
          <Callout n={3} tone={on}>
            <div className="text-subtitle-large-regular">Chat, call or video with a top advisor today.</div>
          </Callout>
          <Callout n={4} tone={on}>
            <span
              className="text-caption-medium-emphasis"
              style={{
                display: 'inline-block',
                padding: '10px 20px',
                borderRadius: 'var(--radius-button)',
                background: on,
                color: 'var(--color-branding-primary)',
              }}
            >
              Start now
            </span>
          </Callout>
          <div style={{ height: 16 }} />
          <Callout n={5} tone={on}>
            <span className="text-caption-small-regular">Offer valid for new customers until Dec 31, 2026.</span>
          </Callout>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 16 }}>
          {tiles.map((tile, i) => (
            <div key={tile} style={{ display: 'grid', gap: 12 }}>
              <div style={{ aspectRatio: '1', borderRadius: 16, background: 'rgba(255, 255, 255, 0.25)' }} />
              {i === tiles.length - 1 ? (
                <Callout n={2} tone={on} side="right">
                  <span className="text-title-small-emphasis">{tile} ›</span>
                </Callout>
              ) : (
                <span className="text-title-small-emphasis">{tile} ›</span>
              )}
            </div>
          ))}
        </div>
      </div>
      <div className="ds-legend">
        {OVERVIEW_LEGEND.map((role, i) => (
          <div key={role} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span
              style={{
                width: 36,
                height: 36,
                borderRadius: 999,
                display: 'grid',
                placeItems: 'center',
                background: 'var(--color-background-secondary)',
                fontSize: 14,
              }}
            >
              {i + 1}
            </span>
            <span className="text-subtitle-large-regular" style={secondary}>
              {role}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export const InUse: Story = {
  name: 'In use',
  render: (_, { globals }) => {
    const tokens = tokensFor(globals.brand);
    const bp = useBreakpoint();
    if (!byPrefix(tokens, '--text-').length) return <Empty />;

    // "35–87px" or "17px": every size of a category at the current breakpoint.
    const range = (category: string) => {
      const sizes = byPrefix(tokens, `--text-${category}-`)
        .filter(t => t.name.endsWith('-regular'))
        .map(t => Number(sizeAt(tokens, category, t.name.split('-')[4], bp)))
        .filter(n => !Number.isNaN(n));
      const [min, max] = [Math.min(...sizes), Math.max(...sizes)];
      return min === max ? `${min}px` : `${min}–${max}px`;
    };

    const examples: { role: string; text: string; stage: ReactNode }[] = [
      {
        role: 'Display',
        text: `Display styles are ${range('display')}. They are the largest, most expressive text: landing-page heroes and big moments in the app. Use one per screen.`,
        stage: (
          <>
            <div className="text-caption-small-emphasis" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>9:15</span>
              <span>●●●</span>
            </div>
            <div className="text-body-large-emphasis">Readings</div>
            <Callout n={1}>
              <div className="text-display-small-emphasis">Find clarity today</div>
            </Callout>
            <div
              style={{
                height: 80,
                borderRadius: 12,
                background: 'var(--color-background-secondary)',
              }}
            />
          </>
        ),
      },
      {
        role: 'Title',
        text: `Titles are ${range('title')} and open a section: screen headers, card titles and dialogs.`,
        stage: (
          <Callout n={2}>
            <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
              <span
                style={{
                  width: 44,
                  height: 44,
                  flexShrink: 0,
                  borderRadius: 999,
                  display: 'grid',
                  placeItems: 'center',
                  background: 'var(--color-background-secondary)',
                  color: 'var(--color-icon-primary)',
                  fontSize: 20,
                }}
              >
                ✓
              </span>
              <div style={{ display: 'grid', gap: 4, flex: 1 }}>
                <div className="text-title-small-emphasis">Satisfaction guarantee</div>
                <div className="text-body-small-regular" style={secondary}>
                  Not happy with a reading? Get your credits back.
                </div>
              </div>
              <span style={{ fontSize: 20, color: 'var(--color-icon-primary)' }}>›</span>
            </div>
          </Callout>
        ),
      },
      {
        role: 'Subtitle',
        text: `Subtitles are ${range('subtitle')} in regular weight. They sit under a title and explain what the section is about.`,
        stage: (
          <>
            <div className="text-title-large-emphasis">Your first 3 minutes are free</div>
            <Callout n={3}>
              <div className="text-subtitle-large-regular">Chat with a top advisor today. No card needed.</div>
            </Callout>
            <PrimaryButton>Start now</PrimaryButton>
          </>
        ),
      },
      {
        role: 'Body',
        text: `Body copy is ${range('body')}, in regular or emphasis. Use it for descriptions and paragraphs.`,
        stage: (
          <>
            <div className="text-title-small-emphasis">About me</div>
            <Callout n={4}>
              <div className="text-body-large-regular" style={secondary}>
                I have been reading tarot for over fifteen years. My sessions are calm and honest, and focus on love,
                career and the choices in front of you.
              </div>
            </Callout>
            <div className="text-title-small-emphasis">Specialties</div>
          </>
        ),
      },
      {
        role: 'Caption',
        text: `Captions are ${range('caption')}. Use them for button labels, tags, metadata, helper text and legal copy.`,
        stage: (
          <>
            <Callout n={5}>
              <span
                className="text-caption-small-emphasis"
                style={{
                  justifySelf: 'start',
                  display: 'inline-block',
                  padding: '4px 10px',
                  borderRadius: 'var(--radius-4)',
                  background: 'var(--color-background-secondary)',
                  color: 'var(--color-states-success)',
                }}
              >
                Online now
              </span>
            </Callout>
            <div style={{ height: 40 }} />
            <Callout n={5}>
              <div className="text-caption-large-regular" style={secondary}>
                By tapping “Start reading”, you agree to the Terms of Service.
              </div>
            </Callout>
            <Callout n={5}>
              <PrimaryButton wide>Start reading</PrimaryButton>
            </Callout>
          </>
        ),
      },
    ];

    return (
      <Page>
        <Section title="Type styles">
          <Overview />
          <div className="ds-cards-wide">
            {examples.map(e => (
              <div key={e.role} style={{ display: 'grid', gap: 16, alignContent: 'start' }}>
                {<Stage>{e.stage}</Stage>}
                <div className="text-title-medium-emphasis">{e.role}</div>
                <p className="text-body-large-regular" style={{ ...secondary, margin: 0, maxWidth: '60ch' }}>
                  {e.text}
                </p>
              </div>
            ))}
          </div>
        </Section>
      </Page>
    );
  },
};

export const TextStyles: Story = {
  name: 'Text styles',
  render: (_, { globals }) => {
    const tokens = tokensFor(globals.brand);
    const styles = byPrefix(tokens, '--text-');
    const bp = useBreakpoint();
    if (!styles.length) return <Empty />;
    const find = (name: string) => tokens.find(t => t.name === name);
    // Size in px at each breakpoint, via --typography-* → --font-size-*.
    const sizes = (category: string, size: string) => {
      const step = find(find(`--typography-${category}-${size}`)?.values.any.ref ?? '');
      return step ? [step.values.any, step.values[TABLET], step.values[DESKTOP]].map(v => v?.value ?? '—') : [];
    };
    return (
      <Page>
        <Section
          title="Text styles"
          subtitle={`Each style is a .text-* class. Family and weight follow the Brand toolbar. Sizes are mobile / tablet / desktop; the bolder one is ${BREAKPOINT_NAMES[bp]}, the current preview width.`}
        >
          {styles.map(t => {
            const className = t.name.slice(2);
            const [, category, size, variant] = className.split('-');
            const family = familyOf(tokens, category);
            const weight = find(`--font-weight-${variant === 'emphasis' ? 'emphasis' : 'regular'}`);
            const px = sizes(category, size);
            return (
              <div
                key={t.name}
                title={t.description}
                style={{
                  display: 'grid',
                  gap: 8,
                  paddingBottom: 16,
                  borderBottom: '1px solid var(--color-border-primary)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '4px 16px',
                    alignItems: 'baseline',
                  }}
                >
                  <code style={{ ...mono, color: 'var(--color-text-secondary)' }}>.{className}</code>
                  <span style={{ ...muted, fontSize: 12 }}>
                    {family}
                    {' · '}
                    {String(weight?.values.any.value ?? '')}
                    {px.length > 0 && ' · '}
                    {px.map((v, i) => (
                      <span key={i}>
                        {i > 0 && ' / '}
                        <span style={i === bp ? { fontWeight: 600 } : undefined}>{String(v)}</span>
                      </span>
                    ))}
                    {px.length > 0 && 'px'}
                  </span>
                </div>
                <div className={className} style={{ overflowWrap: 'anywhere' }}>
                  Find your psychic advisor
                </div>
              </div>
            );
          })}
        </Section>
      </Page>
    );
  },
};

export const TypeScale: Story = {
  name: 'Type scale',
  render: (_, { globals }) => {
    const tokens = tokensFor(globals.brand);
    const scale = byPrefix(tokens, '--typography-');
    const bp = useBreakpoint();
    const active = (i: number) => (i === bp ? { color: 'var(--color-text-primary)', fontWeight: 700 } : {});
    const sizes = new Map(byPrefix(tokens, '--font-size-').map(t => [t.name, t]));
    if (!scale.length) return <Empty />;
    const px = (ref: string | undefined, bp: string) => {
      const size = ref ? sizes.get(ref) : undefined;
      return size ? String((size.values[bp] ?? size.values.any).value) : '—';
    };
    return (
      <Page>
        <Section
          title="Responsive type scale"
          subtitle="Font size in px per breakpoint. ● marks the one active at the current preview width."
        >
          <Table head={['Token', 'Size step', ...BREAKPOINT_NAMES.map((n, i) => (i === bp ? `${n} ●` : n)), 'Usage']}>
            {scale.map(t => {
              const ref = t.values.any.ref;
              return (
                <tr key={t.name}>
                  <td style={{ ...cell, ...mono }}>{t.name}</td>
                  <td style={{ ...cell, ...mono, ...muted }}>{ref ?? '—'}</td>
                  {['any', TABLET, DESKTOP].map((b, i) => (
                    <td key={b} style={{ ...cell, ...mono, ...active(i) }}>
                      {px(ref, b)}
                    </td>
                  ))}
                  <td style={{ ...cell, ...muted, maxWidth: 380 }}>{t.description}</td>
                </tr>
              );
            })}
          </Table>
        </Section>
      </Page>
    );
  },
};
