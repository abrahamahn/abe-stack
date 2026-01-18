// config/schema/lint.ts
/**
 * Lint Configuration Schema - Prettier, ESLint & VS Code Settings
 *
 * Edit this file to change linting/formatting settings across the monorepo.
 * Run: pnpm config:generate
 */

/**
 * Prettier configuration
 */
export const prettier = {
  singleQuote: true,
  trailingComma: 'all' as const,
  printWidth: 100,
  semi: true,
} as const;

/**
 * Prettier ignore patterns
 */
export const prettierIgnore = [
  '# dependencies and builds',
  'node_modules',
  '.turbo',
  '.cache',
  'dist',
  'build',
  'coverage',
  '.next',
  'out',
  '',
  '# generated artifacts',
  '*.tsbuildinfo',
  '',
  '# lockfiles and pnpm store',
  'pnpm-lock.yaml',
  '.pnpm-store',
  '',
  '# agent config symlinks',
  '.claude/',
  '.gemini/',
] as const;

/**
 * ESLint file extensions
 */
export const eslintExtensions = [
  '.js',
  '.jsx',
  '.ts',
  '.tsx',
  '.cjs',
  '.mjs',
  '.cts',
  '.mts',
] as const;

/**
 * Package.json scripts related to linting
 */
export const packageJsonScripts = {
  'lint:staged':
    'eslint --cache --cache-location .cache/eslint/.cache --report-unused-disable-directives --max-warnings=0 --no-warn-ignored',
} as const;

/**
 * Lint-staged configuration
 */
export const lintStaged = {
  '*.{ts,tsx,js,jsx,cjs,mjs,cts,mts,json,css,scss,md}': [
    'pnpm prettier --config config/.prettierrc --ignore-path config/.prettierignore --write',
  ],
  '**/*.{ts,tsx,js,jsx,cjs,mjs,cts,mts}': ['pnpm lint:staged'],
} as const;

/**
 * VS Code settings for linting
 */
export const vscodeSettings = {
  'eslint.useFlatConfig': true,
  'eslint.workingDirectories': [{ mode: 'auto' }],
  'eslint.validate': ['javascript', 'javascriptreact', 'typescript', 'typescriptreact'],
  'eslint.format.enable': false,
  'editor.codeActionsOnSave': {
    'source.fixAll.eslint': 'explicit',
  },
  'typescript.tsdk': 'node_modules/typescript/lib',
} as const;

/**
 * Additional VS Code settings (beyond ESLint integration)
 */
export const vscodeAdditionalSettings = {
  'cSpell.words': ['lockfiles', 'PERN', 'subdirs', 'unrs', 'winstaller'],
  'cSpell.enabled': false,
  'markdown.validate.enabled': false,
  'markdownlint.config': {
    default: false,
  },
} as const;
