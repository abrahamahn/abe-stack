// config/schema/typescript.ts
/**
 * TypeScript Configuration Schema - Single Source of Truth
 *
 * Edit this file to change TypeScript settings across the monorepo.
 * Run: pnpm config:generate
 */

/**
 * Base compiler options inherited by all projects
 */
export const baseCompilerOptions = {
  // Monorepo & Build Performance
  composite: true,
  declaration: true,
  declarationMap: true,
  sourceMap: true,
  incremental: true,

  // Language Fundamentals
  target: 'ES2022',
  lib: ['ES2022'],
  module: 'ESNext',
  moduleResolution: 'bundler',
  resolveJsonModule: true,

  // Modern Strictness
  strict: true,
  noUncheckedIndexedAccess: true,
  noImplicitOverride: true,
  noFallthroughCasesInSwitch: true,
  noUnusedLocals: true,
  noUnusedParameters: true,
  noImplicitReturns: true,

  // Module Safety
  isolatedModules: true,
  verbatimModuleSyntax: true,
  esModuleInterop: true,
  allowSyntheticDefaultImports: true,
  forceConsistentCasingInFileNames: true,
  skipLibCheck: true,

  // Clean Console
  ignoreDeprecations: '5.0',
} as const;

/**
 * React-specific compiler options (extends base)
 */
export const reactCompilerOptions = {
  composite: false,
  declaration: false,
  declarationMap: false,
  target: 'ES2022',
  useDefineForClassFields: true,
  lib: ['ES2022', 'DOM', 'DOM.Iterable'],
  module: 'ESNext',
  moduleResolution: 'bundler',
  allowImportingTsExtensions: true,
  resolveJsonModule: true,
  isolatedModules: true,
  noEmit: true,
  jsx: 'react-jsx',
} as const;

/**
 * Node.js-specific compiler options (extends base)
 */
export const nodeCompilerOptions = {
  target: 'ES2022',
  lib: ['ES2022'],
  module: 'Node16',
  moduleResolution: 'node16',
  verbatimModuleSyntax: false,
} as const;

/**
 * Excluded directories for all tsconfig files
 */
export const baseExclude = ['node_modules', 'dist', 'build', 'coverage'] as const;

/**
 * Directory names that should NOT be aliased (too common/generic)
 */
export const excludedAliasNames = new Set(['utils', 'helpers', 'types', 'constants']);

/**
 * Directories to skip when scanning for aliases
 */
export const skipDirs = new Set([
  'node_modules',
  '__tests__',
  'dist',
  '.turbo',
  '.cache',
  'build',
  'coverage',
  '.git',
]);

/**
 * Maximum depth for auto-discovered path aliases (relative to srcDir)
 */
export const maxAliasDepth = 3;

/**
 * Project configuration type
 */
export interface ProjectConfig {
  /** Which base tsconfig to extend */
  extends: 'react' | 'node' | 'base';
  /** Additional compiler options */
  compilerOptions?: Record<string, unknown>;
  /** Types to include */
  types?: string[];
  /** Include patterns */
  include?: string[];
  /** Exclude patterns */
  exclude?: string[];
  /** Directories to scan for path aliases (relative to project src) */
  aliasScanDirs?: string[];
  /** Manual path aliases (bypasses auto-discovery) */
  manualPaths?: Record<string, string[]>;
  /** Workspace package references (package names) */
  references?: string[];
}

/**
 * Per-project configuration
 */
export const projects: Record<string, ProjectConfig> = {
  'apps/web': {
    extends: 'react',
    types: ['vite/client', 'react', 'react-dom', 'vitest/globals'],
    aliasScanDirs: ['', 'features'], // Relative to src/
    references: ['@abe-stack/core', '@abe-stack/sdk', '@abe-stack/ui'],
  },

  'apps/server': {
    extends: 'node',
    types: ['node', 'vitest/globals'],
    compilerOptions: {
      outDir: './dist',
      rootDir: './src',
    },
    aliasScanDirs: ['', 'infra', 'modules'],
    exclude: ['dist'],
    references: ['@abe-stack/core'],
  },

  'apps/desktop': {
    extends: 'react',
    types: ['vite/client', 'react', 'react-dom'],
    aliasScanDirs: [''],
    exclude: ['__tests__', 'src/electron'],
    references: ['@abe-stack/core', '@abe-stack/ui'],
  },

  'packages/core': {
    extends: 'base',
    types: ['node', 'vitest/globals'],
    compilerOptions: {
      outDir: './dist',
      rootDir: './src',
      baseUrl: './',
    },
    manualPaths: {
      '@contracts': ['./src/contracts'],
      '@contracts/*': ['./src/contracts/*'],
      '@utils': ['./src/utils'],
      '@utils/*': ['./src/utils/*'],
    },
    exclude: ['dist', 'src/**/__tests__/**'],
  },

  'packages/ui': {
    extends: 'base',
    types: ['react', 'react-dom', 'vitest/globals'],
    compilerOptions: {
      outDir: './dist',
      rootDir: './src',
      jsx: 'react-jsx',
      lib: ['ES2022', 'DOM', 'DOM.Iterable'],
      baseUrl: './',
    },
    manualPaths: {
      '@abe-stack/core': ['../core/src'],
      '@abe-stack/core/*': ['../core/src/*'],
      '@components': ['./src/components'],
      '@components/*': ['./src/components/*'],
      '@containers': ['./src/layouts/containers'],
      '@containers/*': ['./src/layouts/containers/*'],
      '@elements': ['./src/elements'],
      '@elements/*': ['./src/elements/*'],
      '@hooks': ['./src/hooks'],
      '@hooks/*': ['./src/hooks/*'],
      '@layers': ['./src/layouts/layers'],
      '@layers/*': ['./src/layouts/layers/*'],
      '@layouts': ['./src/layouts'],
      '@layouts/*': ['./src/layouts/*'],
      '@shells': ['./src/layouts/shells'],
      '@shells/*': ['./src/layouts/shells/*'],
      '@theme': ['./src/theme'],
      '@theme/*': ['./src/theme/*'],
      '@utils': ['./src/utils'],
      '@utils/*': ['./src/utils/*'],
    },
    exclude: ['dist', 'src/**/__tests__/**'],
    references: ['@abe-stack/core'],
  },

  'packages/sdk': {
    extends: 'base',
    types: ['vitest/globals', 'node'],
    compilerOptions: {
      outDir: './dist',
      rootDir: './src',
      lib: ['ES2022', 'DOM'],
      jsx: 'react-jsx',
      baseUrl: './',
    },
    manualPaths: {
      '@abe-stack/core': ['../core/src'],
      '@abe-stack/core/*': ['../core/src/*'],
    },
    exclude: ['dist', 'src/**/__tests__/**'],
    references: ['@abe-stack/core'],
  },

  'packages/media': {
    extends: 'base',
    types: ['node', 'vitest/globals'],
    compilerOptions: {
      outDir: './dist',
      rootDir: './src',
      baseUrl: './',
    },
    exclude: ['dist', 'src/**/__tests__/**'],
  },

  'packages/stores': {
    extends: 'base',
    types: ['node', 'vitest/globals'],
    compilerOptions: {
      outDir: './dist',
      rootDir: './src',
      baseUrl: './',
    },
    manualPaths: {
      '@abe-stack/core': ['../core/src'],
      '@abe-stack/core/*': ['../core/src/*'],
    },
    exclude: ['dist', 'src/**/__tests__/**'],
    references: ['@abe-stack/core'],
  },
};

/**
 * Package name to directory mapping
 */
export const packageDirs: Record<string, string> = {
  '@abe-stack/core': 'packages/core',
  '@abe-stack/media': 'packages/media',
  '@abe-stack/sdk': 'packages/sdk',
  '@abe-stack/stores': 'packages/stores',
  '@abe-stack/ui': 'packages/ui',
  '@abe-stack/web': 'apps/web',
  '@abe-stack/server': 'apps/server',
  '@abe-stack/desktop': 'apps/desktop',
};
