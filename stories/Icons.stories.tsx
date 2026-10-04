import type { Meta, StoryObj } from '@storybook/react-vite';
import { IconLibrary } from './IconLibrary';

const meta: Meta = { title: 'Icons', parameters: { layout: 'fullscreen' } };
export default meta;
type Story = StoryObj;

export const IconLibraryPage: Story = {
  name: 'Icon library',
  render: (_, { globals }) => <IconLibrary kind="icons" brand={globals.brand} theme={globals.theme} />,
};
