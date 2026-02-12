# Sync Scripts

DX automation scripts that keep the codebase consistent. All scripts live in `src/tools/sync/`.

## Overview

| Script                  | Command             | Purpose                                              |
| ----------------------- | ------------------- | ---------------------------------------------------- |
| `sync-file-headers.ts`  | `pnpm sync:headers` | Ensures every source file starts with a path comment |
| `sync-css-theme.ts`     | `pnpm build:theme`  | Generates `theme.css` from TypeScript theme source   |
| `sync-ts-references.ts` | `pnpm sync:ts`      | Updates root `tsconfig.json` project references      |
| `sync-docs.ts`          | `pnpm sync:docs`    | No-op (docs now discovered via `import.meta.glob`)   |

## sync-file-headers

Ensures every `.ts`, `.tsx`, `.js`, `.jsx` file starts with a `// path/to/file.ts` header comment.

### How It Works

1. Scans all files under `src/` (excluding `node_modules`, `.cache`, `dist`, `build`, `__tests__`)
2. Computes the expected header from the file's relative path
3. Adds or updates the header if missing or incorrect
4. Skips `.d.ts` files

### Modes

```bash
pnpm sync:headers              # Fix all files (interactive)
pnpm sync:headers:check        # Check mode (CI-safe, exits non-zero if out of sync)
pnpm sync:headers:staged       # Fix only git-staged files (used in pre-commit)
pnpm sync:headers:watch        # Watch mode (fixes on file change)
```

### When It Runs

- **Pre-commit hook**: `pnpm sync:headers:staged` runs on staged files
- **Pre-push hook**: `pnpm sync:headers:check` verifies all files
- **CI**: Verified in the `sanity-checks` job via `pnpm sync:headers:check`
- **Dev mode**: Can be run manually or in watch mode

### File Extensions

Processed: `.ts`, `.tsx`, `.js`, `.jsx`, `.cts`, `.mts`, `.cjs`, `.mjs`

## sync-css-theme

Generates `src/client/ui/src/styles/theme.css` from TypeScript theme source files.

### How It Works

1. Reads theme source files from `src/client/ui/src/theme/`:
   - `colors.ts` -- color palette (light/dark)
   - `spacing.ts` -- gap tokens
   - `radius.ts` -- border radius tokens
   - `typography.ts` -- font size/weight tokens
   - `motion.ts` -- animation duration tokens
2. Calls `generateThemeCss()` from `buildThemeCss.ts` to produce CSS custom properties
3. Formats with Prettier and writes to `theme.css`
4. Uses content hashing (`node_modules/.cache/theme-css.hash`) to skip rebuilds when source is unchanged

### Command

```bash
pnpm build:theme     # Generate theme.css (skips if unchanged)
```

### Cache

A SHA-256 hash of all theme source files is stored at `node_modules/.cache/theme-css.hash`. The build is skipped when the hash matches, making repeated runs near-instant.

## sync-ts-references

Updates the root `tsconfig.json` `references` array to include all packages that have their own `tsconfig.json`.

### How It Works

1. Scans directories under `src/apps/`, `src/client/`, `src/server/`, `src/shared/`
2. Finds subdirectories containing a `tsconfig.json`
3. Updates the root `tsconfig.json` `references` array with relative paths
4. Preserves existing non-scanned references

### Command

```bash
pnpm sync:ts         # Update tsconfig references
```

## sync-docs

Previously auto-generated docs metadata from the `docs/` folder structure. Now a no-op -- docs are discovered at build time via Vite's `import.meta.glob` in `src/apps/web/src/features/home/data/docsMeta.ts`.

```bash
pnpm sync:docs       # No-op (prints skip message)
```

## Integration with Dev Workflow

### During `pnpm dev`

The dev script (`src/tools/scripts/dev/dev.ts`) starts sync watchers alongside the dev servers. File headers and theme CSS are kept in sync automatically during development.

### Pre-commit

The pre-commit hook runs `pnpm sync:headers:staged` to fix headers on staged files before they are committed.

### CI

The CI pipeline runs `pnpm sync:headers:check` early in the `sanity-checks` job. If any file header is out of sync, the check fails with a non-zero exit code.
