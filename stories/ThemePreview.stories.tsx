import type { CSSProperties } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { ON_BRAND_TEXT, Page } from './tokens';

/** A small screen built only from tokens — flip Brand / Theme in the toolbar. */
const meta: Meta = { title: 'Theme preview' };
export default meta;

const button = (bg: string, fg: string, border = bg): CSSProperties => ({
  background: `var(${bg})`,
  color: `var(${fg})`,
  border: `1px solid var(${border})`,
  borderRadius: 'var(--radius-button)',
  padding: 'var(--grid-12) var(--grid-24)',
  cursor: 'pointer',
});

const channels = ['chat', 'voice', 'video'] as const;

export const AdvisorCard: StoryObj = {
  name: 'Advisor card',
  render: () => (
    <Page>
      <div
        style={{
          background: 'var(--color-background-secondary)',
          padding: 'var(--grid-24)',
          borderRadius: 'var(--radius-16)',
        }}
      >
        <div
          style={{
            background: 'var(--color-background-primary)',
            border: '1px solid var(--color-border-primary)',
            borderRadius: 'var(--radius-16)',
            padding: 'var(--grid-24)',
            display: 'grid',
            gap: 'var(--grid-16)',
            maxWidth: 420,
          }}
        >
          <div style={{ display: 'flex', gap: 'var(--grid-16)', alignItems: 'center' }}>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: 'var(--radius-full)',
                background:
                  'linear-gradient(135deg, var(--color-gradients-primary-first), var(--color-gradients-primary-second))',
              }}
            />
            <div>
              <div className="text-title-small-emphasis">Advisor Luna</div>
              <div className="text-caption-large-regular" style={{ color: 'var(--color-text-secondary)' }}>
                Tarot · Love readings
              </div>
            </div>
            <span
              className="text-caption-small-emphasis"
              style={{
                marginLeft: 'auto',
                color: 'var(--color-states-success)',
                border: '1px solid var(--color-states-success)',
                borderRadius: 'var(--radius-4)',
                padding: 'var(--grid-2) var(--grid-8)',
              }}
            >
              Online
            </span>
          </div>
          <p className="text-body-small-regular" style={{ margin: 0, color: 'var(--color-text-secondary)' }}>
            Clear, compassionate guidance on relationships and life direction.
          </p>
          <div style={{ display: 'flex', gap: 'var(--grid-8)' }}>
            {channels.map(c => (
              <div
                key={c}
                className="text-caption-medium-emphasis"
                style={{
                  flex: 1,
                  textAlign: 'center',
                  padding: 'var(--grid-8)',
                  borderRadius: 'var(--radius-8)',
                  background: `var(--color-button-channel-${c}-online)`,
                  color: `var(--color-icon-channel-${c})`,
                  textTransform: 'capitalize',
                }}
              >
                {c}
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 'var(--grid-8)', flexWrap: 'wrap' }}>
            <button
              className="text-caption-medium-emphasis"
              style={button('--color-button-primary-default', ON_BRAND_TEXT)}
            >
              Start reading
            </button>
            <button
              className="text-caption-medium-emphasis"
              style={button('--color-button-secondary-default', '--color-text-primary', '--color-border-primary')}
            >
              View profile
            </button>
            <button
              className="text-caption-medium-emphasis"
              style={button('--color-button-accent-default', ON_BRAND_TEXT)}
            >
              Add funds
            </button>
          </div>
        </div>
      </div>
    </Page>
  ),
};
