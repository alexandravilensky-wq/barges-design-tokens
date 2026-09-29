import type { Meta, StoryObj } from '@storybook/react-vite';
import { Empty, Page, Section, byPrefix, mono, muted, tokensFor } from './tokens';

const meta: Meta = { title: 'Tokens/Spacing & Radius' };
export default meta;
type Story = StoryObj;

export const Spacing: Story = {
  render: (_, { globals }) => {
    const grid = byPrefix(tokensFor(globals.brand), '--grid-');
    if (!grid.length) return <Empty />;
    return (
      <Page>
        <Section title="Spacing grid" subtitle="4px baseline. Hover a row for usage notes.">
          <div style={{ display: 'grid', gap: 6 }}>
            {grid.map(t => (
              <div
                key={t.name}
                title={t.description}
                style={{ display: 'grid', gridTemplateColumns: '100px 60px minmax(0, 1fr)', gap: 12, alignItems: 'center' }}
              >
                <span style={mono}>{t.name}</span>
                <span style={{ ...mono, ...muted }}>{String(t.values.any.value)}px</span>
                <div
                  style={{
                    width: `var(${t.name})`,
                    maxWidth: '100%',
                    height: 12,
                    borderRadius: 2,
                    background: 'var(--color-branding-primary)',
                  }}
                />
              </div>
            ))}
          </div>
        </Section>
      </Page>
    );
  },
};

export const Radius: Story = {
  render: (_, { globals }) => {
    const radius = byPrefix(tokensFor(globals.brand), '--radius-');
    if (!radius.length) return <Empty />;
    return (
      <Page>
        <Section title="Corner radius" subtitle="--radius-button is set per brand.">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24 }}>
            {radius.map(t => (
              <div key={t.name} title={t.description} style={{ display: 'grid', gap: 6, justifyItems: 'center' }}>
                <div
                  style={{
                    width: 88,
                    height: 88,
                    borderRadius: `var(${t.name})`,
                    background: 'var(--color-background-secondary)',
                    border: '2px solid var(--color-branding-primary)',
                  }}
                />
                <span style={mono}>{t.name}</span>
                <span style={{ ...mono, ...muted }}>
                  {Number(t.values.any.value) >= 999 ? 'full' : `${t.values.any.value}px`}
                </span>
              </div>
            ))}
          </div>
        </Section>
      </Page>
    );
  },
};
