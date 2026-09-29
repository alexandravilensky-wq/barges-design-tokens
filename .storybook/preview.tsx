import type { Preview } from '@storybook/react-vite';
import brands from '../build/brands.json';

// Figma breakpoints (figma-breakpoint.json).
const SCREENS = {
  mobile: { name: 'Mobile (<768)', styles: { width: '375px', height: '812px' }, type: 'mobile' },
  tablet: { name: 'Tablet (768–1023)', styles: { width: '768px', height: '1024px' }, type: 'tablet' },
  desktop: { name: 'Desktop (≥1024)', styles: { width: '1280px', height: '800px' }, type: 'desktop' },
} as const;

const preview: Preview = {
  globalTypes: {
    brand: {
      description: 'Brand',
      toolbar: {
        title: 'Brand',
        icon: 'paintbrush',
        items: Object.entries(brands).map(([value, title]) => ({ value, title })),
        dynamicTitle: true,
      },
    },
    theme: {
      description: 'Light or dark mode',
      toolbar: {
        title: 'Theme',
        icon: 'moon',
        items: [
          { value: 'light', title: 'Light', icon: 'sun' },
          { value: 'dark', title: 'Dark', icon: 'moon' },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { brand: 'purple-garden', theme: 'light' },
  parameters: {
    layout: 'fullscreen',
    backgrounds: { disable: true },
    // Resizes the preview so the responsive font sizes switch like on a device.
    viewport: { options: SCREENS },
  },
  decorators: [
    (Story, { globals }) => {
      // Swap the generated brand stylesheet and flip data-theme; every token
      // on the page is a CSS variable, so the whole story re-themes.
      const id = 'brand-tokens';
      let link = document.getElementById(id) as HTMLLinkElement | null;
      if (!link) {
        link = Object.assign(document.createElement('link'), { id, rel: 'stylesheet' });
        document.head.appendChild(link);
      }
      const href = `./css/${globals.brand}.css`;
      if (link.getAttribute('href') !== href) link.setAttribute('href', href);
      document.documentElement.dataset.theme = globals.theme;

      Object.assign(document.body.style, {
        margin: '0',
        background: 'var(--color-background-primary)',
        color: 'var(--color-text-primary)',
        fontFamily: 'var(--font-family-body), system-ui, sans-serif',
      });
      return <Story />;
    },
  ],
};

export default preview;
