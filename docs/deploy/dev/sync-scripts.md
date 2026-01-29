# Sync Scripts (DX Automation)

**Last Updated: January 30, 2026**

Comprehensive guide to the ABE Stack developer experience automation scripts. These TypeScript scripts handle repetitive tasks automatically during development.

> **Related Documentation:**
>
> - [Configuration](./configuration.md) - Core monorepo configuration
> - [Workflow](./workflow.md) - Testing, CI/CD, Git hooks

---

## Table of Contents

1. [Overview](#overview)
2. [Execution Modes](#execution-modes)
3. [How Automation Works](#how-automation-works)
4. [sync-file-headers.ts](#1-sync-file-headersts)
5. [sync-tsconfig.ts](#2-sync-tsconfigts)
6. [sync-linting.ts](#3-sync-lintingts)
7. [sync-css-theme.ts](#4-sync-css-themets)
8. [Manual vs Automatic Execution](#manual-vs-automatic-execution-summary)

---

## Overview

Four TypeScript sync scripts automate repetitive development tasks. All scripts are located in `tooling/sync/`:

| Script                 | Purpose                                                         |
| ---------------------- | --------------------------------------------------------------- |
| `sync-file-headers.ts` | Ensure source files have path comment headers                   |
| `sync-tsconfig.ts`     | Auto-generate TypeScript project references                     |
| `sync-linting.ts`      | Sync linting config to `package.json` + `.vscode/settings.json` |
| `sync-css-theme.ts`    | Generate CSS custom properties from theme tokens                |

---

## Execution Modes

Most sync scripts (except `sync-css-theme.ts`, `sync-linting.ts`, and `sync-tsconfig.ts`) support three modes:

| Mode      | Flag      | Description                                                 |
| --------- | --------- | ----------------------------------------------------------- |
| **Sync**  | (none)    | Run once, make changes                                      |
| **Check** | `--check` | Verify without changes (CI mode, exits 1 if changes needed) |
| **Watch** | `--watch` | Continuous monitoring with auto-sync                        |

All watcher scripts also support `--quiet` for silent operation (used by `pnpm dev`).

---

## How Automation Works

### Development (`pnpm dev`)

```typescript
// tooling/scripts/dev/dev.ts
const watchers = [
  startWatcher('tooling/sync/sync-file-headers.ts'),
  startWatcher('tooling/sync/sync-css-theme.ts'),
];
```

Two scripts run in watch mode with `--quiet` flag in background processes. `sync-tsconfig.ts` and `sync-linting.ts` run on demand (sync/check only).

### Pre-commit Hook

```bash
pnpm config:generate && pnpm sync:headers && pnpm sync:theme
```

### CI Pipeline (`.github/workflows/ci.yml`)

```yaml
- run: pnpm sync:tsconfig:check
- run: pnpm sync:headers:check
```

---

## 1. sync-file-headers.ts

**Purpose:** Ensure every source file starts with a path comment header.

**Commands:**

```bash
pnpm sync:headers        # Sync once
pnpm sync:headers:check  # Verify
pnpm sync:headers:watch  # Watch mode
```

**Result:**

```typescript
// packages/core/src/validation/index.ts
export { ... };
```

### Scope Included

**Directories scanned:** `apps`, `packages`, `tools`, `config`

**File extensions:** `.ts`, `.tsx`, `.js`, `.jsx`, `.cts`, `.mts`, `.cjs`, `.mjs`

### Scope Excluded

**Directories skipped:**

- `node_modules`, `.cache`, `.turbo`, `dist`, `build`, `coverage`, `.git`, `__tests__`

**Files skipped:**

- `.d.ts` declaration files

### How It Works

1. **Collects all source files** from scan directories
2. **For each file:**
   - Computes expected header: `// {relative/path/to/file.ts}`
   - Checks if first line (or second line after shebang) matches
   - **If line starts with `//`:** Replace it
   - **If line doesn't start with `//`:** Insert new header line
3. **Handles shebangs:** Preserves `#!/usr/bin/env node` on line 1, places header on line 2

### Watch Mode

Uses `fs.watch` with `recursive: true` on all scan directories. 100ms debounce on file changes.

---

## 2. sync-tsconfig.ts

**Purpose:** Auto-generate TypeScript project references based on workspace dependencies.

**Commands:**

```bash
pnpm sync:tsconfig        # Sync once
pnpm sync:tsconfig:check  # Verify (CI mode)
```

### Source of Truth

`pnpm-workspace.yaml` + each package's `package.json` dependencies.

### How It Works

1. **Discovers** workspace projects from `pnpm-workspace.yaml`
2. **Maps** workspace package names to their directories
3. **Reads** dependency graph from `package.json`
4. **Writes** `references` arrays in each `tsconfig.json`
5. **Updates** root `tsconfig.json` to include all workspace projects

---

## 3. sync-linting.ts

**Purpose:** Sync linting config to `package.json` and `.vscode/settings.json`.

**Commands:**

```bash
pnpm sync:linting        # Sync once
pnpm sync:linting:check  # Verify (CI mode)
```

### Source of Truth

`config/linting.json` contains:

- `packageJson.scripts` (e.g. `lint:staged`)
- `packageJson.lint-staged` rules
- `vscode.settings` (ESLint + TypeScript workspace settings)

### How It Works

1. **Reads** `config/linting.json`
2. **Applies** lint-staged + script updates to `package.json`
3. **Merges** VS Code settings into `.vscode/settings.json`
4. **Exits 1 in `--check`** if any updates are needed

---

## 4. sync-css-theme.ts

**Purpose:** Generate CSS custom properties from TypeScript theme tokens.

**Commands:**

```bash
pnpm theme:build  # Build once
pnpm theme:watch  # Watch mode
```

**Note:** This script does NOT have a `--check` mode (uses hash-based caching instead).

### Input Files

Located in `packages/ui/src/theme/`:

- `colors.ts` — Color palette and semantic colors
- `motion.ts` — Animation durations and easings
- `radius.ts` — Border radius values
- `spacing.ts` — Spacing scale
- `typography.ts` — Font families, sizes, weights
- `buildThemeCss.ts` — CSS generation logic

### Output

`packages/ui/src/styles/theme.css` — CSS custom properties:

```css
:root {
  --color-primary-500: #3b82f6;
  --spacing-4: 1rem;
  --radius-md: 0.375rem;
  /* ... */
}
```

### How It Works

1. **Computes SHA-256 hash** of all input files
2. **Checks cache** at `.cache/theme-css.hash`
3. **If hash matches and output exists:** Skip rebuild
4. **Otherwise:**
   - Calls `generateThemeCss()` from `buildThemeCss.ts`
   - Formats output with Prettier
   - Writes to `theme.css`
   - Updates hash cache

### Watch Mode

Watches all input files with 100ms debounce:

```typescript
for (const filePath of themeSourceFiles) {
  fs.watch(filePath, () => debounce());
}
```

---

## Manual vs Automatic Execution Summary

| Script            | `pnpm dev` | Pre-commit | CI Check |
| ----------------- | ---------- | ---------- | -------- |
| sync-file-headers | ✅ Watch   | ✅ Sync    | ✅ Check |
| sync-tsconfig     | ❌         | ✅ Sync    | ✅ Check |
| sync-linting      | ❌         | ✅ Sync    | ❌ N/A   |
| sync-css-theme    | ✅ Watch   | ✅ Build   | ❌ N/A   |

---

_Philosophy: Automation over manual work. Convention over configuration._
