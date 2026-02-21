// main/apps/storybook/.storybook/main.ts
import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|tsx)'],
  addons: ['@storybook/addon-essentials', '@storybook/addon-a11y', '@storybook/addon-viewport'],
  framework: '@storybook/react-vite',
  viteFinal: async (config) => {
    const existingAliasArray = Array.isArray(config.resolve?.alias) ? config.resolve.alias : [];

    return {
      ...config,
      resolve: {
        ...config.resolve,
        alias: [
          ...existingAliasArray,
          {
            find: /^@bslt\/shared\/(.*)$/,
            replacement: `${new URL('../../../shared/src/', import.meta.url).pathname}$1`,
          },
          {
            find: /^@bslt\/client-engine\/(.*)$/,
            replacement: `${new URL('../../../client/engine/src/', import.meta.url).pathname}$1`,
          },
          {
            find: '@bslt/shared',
            replacement: new URL('../../../shared/src/index.ts', import.meta.url).pathname,
          },
          {
            find: '@bslt/client-engine',
            replacement: new URL('../../../client/engine/src/index.ts', import.meta.url).pathname,
          },
          {
            find: '@bslt/ui',
            replacement: new URL('../../../client/ui/src/index.ts', import.meta.url).pathname,
          },
          {
            find: '@components',
            replacement: new URL('../../../client/ui/src/components', import.meta.url).pathname,
          },
          {
            find: '@containers',
            replacement: new URL('../../../client/ui/src/layouts/containers', import.meta.url)
              .pathname,
          },
          {
            find: '@elements',
            replacement: new URL('../../../client/ui/src/elements', import.meta.url).pathname,
          },
          {
            find: '@layers',
            replacement: new URL('../../../client/ui/src/layouts/layers', import.meta.url).pathname,
          },
          {
            find: '@layouts',
            replacement: new URL('../../../client/ui/src/layouts', import.meta.url).pathname,
          },
          {
            find: '@shells',
            replacement: new URL('../../../client/ui/src/layouts/shells', import.meta.url).pathname,
          },
          {
            find: '@theme',
            replacement: new URL('../../../client/ui/src/theme', import.meta.url).pathname,
          },
          {
            find: '@types',
            replacement: new URL('../../../client/ui/src/types', import.meta.url).pathname,
          },
          {
            find: '@utils',
            replacement: new URL('../../../client/ui/src/utils', import.meta.url).pathname,
          },
          {
            find: '@hooks',
            replacement: new URL('../../../client/react/src/hooks', import.meta.url).pathname,
          },
          {
            find: '@providers',
            replacement: new URL('../../../client/react/src/providers', import.meta.url).pathname,
          },
          {
            find: '@router',
            replacement: new URL('../../../client/react/src/router', import.meta.url).pathname,
          },
        ],
      },
    };
  },
};

export default config;
