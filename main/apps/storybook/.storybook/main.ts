// main/apps/storybook/.storybook/main.ts
import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  stories: [
    '../../../client/ui/src/**/*.stories.@(ts|tsx)',
    '../src/**/*.stories.@(ts|tsx)',
    '../stories/**/*.stories.@(ts|tsx)',
  ],
  addons: ['@storybook/addon-essentials', '@storybook/addon-a11y', '@storybook/addon-viewport'],
  framework: '@storybook/react-vite',
  viteFinal: async (config) => {
    return config;
  },
};

export default config;
