import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';

/** Shape written by the `barges/docs-json` format in scripts/build-tokens.mjs. */
export interface TokenValue {
  value: unknown;
  ref?: string;
  unresolvedAlias?: string;
}
export interface Token {
  name: string;
  group: string;
  type: string;
  description?: string;
  values: Record<string, TokenValue>;
}

const files = import.meta.glob<Token[]>('../build/json/*.json', { eager: true, import: 'default' });

export function tokensFor(brand: string): Token[] {
  return files[`../build/json/${brand}.json`] ?? [];
}

/** Value for the active theme, falling back to theme-independent tokens. */
export const valueFor = (token: Token, theme: string) => token.values[theme] ?? token.values.any;

export const byPrefix = (tokens: Token[], prefix: string) => tokens.filter(t => t.name.startsWith(prefix));

/** Active Figma breakpoint for the preview width: 0 mobile, 1 tablet, 2 desktop. */
export function useBreakpoint() {
  const queries = ['(min-width: 768px)', '(min-width: 1024px)'].map(q => window.matchMedia(q));
  // Re-read on every render (viewport changes re-render the story) and on
  // media-query changes, so the value never lags the preview width.
  const [, rerender] = useState(0);
  useEffect(() => {
    const update = () => rerender(n => n + 1);
    queries.forEach(q => q.addEventListener('change', update));
    return () => queries.forEach(q => q.removeEventListener('change', update));
  }, []);
  return queries.filter(q => q.matches).length;
}

/**
 * Text on brand-colored surfaces. Figma's brand file has no semantic
 * "text/tertiary"; figma-modes.json maps it to neutral/100, so use that.
 */
export const ON_BRAND_TEXT = '--primitive-neutral-100';

export const BREAKPOINT_NAMES = ['Mobile', 'Tablet', 'Desktop'];

// ─── Layout helpers ──────────────────────────────────────────────────────────

export const mono: CSSProperties = { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 12 };
export const muted: CSSProperties = { color: 'var(--color-text-secondary)', fontSize: 13 };
export const cell: CSSProperties = {
  padding: '10px 12px',
  borderBottom: '1px solid var(--color-border-primary)',
  textAlign: 'left',
  verticalAlign: 'middle',
};

/**
 * Layout that has to change with screen width lives here (inline styles
 * can't use media queries). Mobile = below the 768px Figma breakpoint.
 */
const RESPONSIVE_CSS = `
.ds-page { padding: 32px; display: grid; gap: 40px; max-width: 1200px; overflow-wrap: break-word; }
.ds-panel { padding: 8px 32px; }
.ds-row { display: grid; grid-template-columns: minmax(100px, 1fr) minmax(0, 3fr); gap: 32px; padding: 32px 0; }
.ds-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(280px, 100%), 1fr)); gap: 16px; }
.ds-cards-wide { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(360px, 100%), 1fr)); gap: 40px 24px; }
.ds-stage { padding: 32px 32px 32px 72px; }
.ds-banner { padding: 56px 80px; display: grid; grid-template-columns: repeat(auto-fit, minmax(min(260px, 100%), 1fr)); gap: 48px; align-items: center; }
.ds-legend { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); grid-template-rows: repeat(3, auto); grid-auto-flow: column; gap: 16px; }
@media (max-width: 767px) {
  .ds-page { padding: 24px 16px; gap: 32px; }
  .ds-panel { padding: 4px 20px; }
  .ds-row { grid-template-columns: minmax(0, 1fr); gap: 8px; padding: 24px 0; }
  .ds-stage { padding: 24px 16px; }
  .ds-banner { padding: 32px 24px; gap: 32px; }
  .ds-legend { grid-template-columns: minmax(0, 1fr); grid-template-rows: none; grid-auto-flow: row; }
  .ds-marker { display: none !important; }
}
`;

export function Page({ children }: { children: ReactNode }) {
  return (
    <div className="ds-page">
      <style>{RESPONSIVE_CSS}</style>
      {children}
    </div>
  );
}

export function Section({ title, subtitle, children }: { title: string; subtitle?: ReactNode; children: ReactNode }) {
  return (
    <section style={{ display: 'grid', gap: 16 }}>
      <div>
        <h2 style={{ margin: 0, fontSize: 22, fontFamily: 'var(--font-family-title), system-ui' }}>{title}</h2>
        {subtitle && <p style={{ ...muted, margin: '6px 0 0' }}>{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

export function Table({ head, children }: { head: string[]; children: ReactNode }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 14 }}>
        <thead>
          <tr>
            {head.map(h => (
              <th key={h} style={{ ...cell, ...muted, fontWeight: 600 }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function Swatch({ cssVar, size = 40 }: { cssVar: string; size?: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        flexShrink: 0,
        borderRadius: 8,
        border: '1px solid var(--color-border-primary)',
        background: `var(${cssVar})`,
      }}
    />
  );
}

export function Empty() {
  return (
    <Page>
      <p>
        No generated tokens found. Run <code style={mono}>npm run build:tokens</code> and restart Storybook.
      </p>
    </Page>
  );
}
