import type { Meta, StoryObj } from '@storybook/react-vite';
import { IconLibrary } from './IconLibrary';

const meta: Meta = { title: 'Illustrations', parameters: { layout: 'fullscreen' } };
export default meta;
type Story = StoryObj;

/** Reading categories and empty states – larger previews than the icon library. */
export const IllustrationLibrary: Story = {
  name: 'Illustration library',
  render: (_, { globals }) => <IconLibrary kind="illustrations" brand={globals.brand} theme={globals.theme} />,
};
