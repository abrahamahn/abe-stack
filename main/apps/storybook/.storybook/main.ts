// main/apps/storybook/.storybook/main.ts
import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|tsx)'],
  addons: ['@storybook/addon-essentials', '@storybook/addon-a11y', '@storybook/addon-viewport'],
  framework: '@storybook/react-vite',
  viteFinal: async (config) => {
    const existingAliases =
      config.resolve?.alias !== undefined &&
      !Array.isArray(config.resolve.alias) &&
      typeof config.resolve.alias === 'object'
        ? config.resolve.alias
        : {};

    return {
      ...config,
      resolve: {
        ...config.resolve,
        alias: {
          ...existingAliases,
          '@bslt/ui': new URL('../../../client/ui/src/index.ts', import.meta.url).pathname,
          '@bslt/shared': new URL('../../../shared/src/index.ts', import.meta.url).pathname,
          '@bslt/shared/': new URL('../../../shared/src/', import.meta.url).pathname,
          '@bslt/client-engine': new URL('../../../client/engine/src/index.ts', import.meta.url)
            .pathname,
          '@bslt/client-engine/': new URL('../../../client/engine/src/', import.meta.url).pathname,
          '@components': new URL('../../../client/ui/src/components', import.meta.url).pathname,
          '@containers': new URL('../../../client/ui/src/layouts/containers', import.meta.url)
            .pathname,
          '@elements': new URL('../../../client/ui/src/elements', import.meta.url).pathname,
          '@layers': new URL('../../../client/ui/src/layouts/layers', import.meta.url).pathname,
          '@layouts': new URL('../../../client/ui/src/layouts', import.meta.url).pathname,
          '@shells': new URL('../../../client/ui/src/layouts/shells', import.meta.url).pathname,
          '@theme': new URL('../../../client/ui/src/theme', import.meta.url).pathname,
          '@types': new URL('../../../client/ui/src/types', import.meta.url).pathname,
          '@utils': new URL('../../../client/ui/src/utils', import.meta.url).pathname,
          '@hooks': new URL('../../../client/react/src/hooks', import.meta.url).pathname,
          '@providers': new URL('../../../client/react/src/providers', import.meta.url).pathname,
          '@router': new URL('../../../client/react/src/router', import.meta.url).pathname,
        },
      },
    };
  },
};

export default config;
