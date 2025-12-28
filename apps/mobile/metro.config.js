const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..', '..');

const config = {
  watchFolders: [repoRoot, path.join(repoRoot, 'packages'), path.join(repoRoot, 'node_modules')],
  resolver: {
    nodeModulesPaths: [
      path.resolve(__dirname, 'node_modules'),
      path.resolve(repoRoot, 'node_modules'),
    ],
    extraNodeModules: {
      '@components': path.resolve(__dirname, 'src/components'),
      '@hooks': path.resolve(__dirname, 'src/hooks'),
      '@services': path.resolve(__dirname, 'src/services'),
      '@config': path.resolve(__dirname, 'src/config'),
      '@utils': path.resolve(__dirname, 'src/utils'),
      '@api': path.resolve(__dirname, 'src/api'),
      '@abe-stack/shared': path.resolve(repoRoot, 'packages/shared/src'),
      '@abe-stack/ui': path.resolve(repoRoot, 'packages/ui/src'),
    },
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
