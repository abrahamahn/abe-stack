# ⚙️ Configuration Architecture

This directory (`.config/`) acts as the **Central Command** for development tooling in the ABE Stack. Instead of cluttering the root directory with dozens of dotfiles, we consolidate tool-specific configurations here to maintain a clean workspace and centralized management.

## 📌 Philosophy: "Clean Root, Central Control"

1.  **Decluttered Root:** The repository root should only contain essential metadata (`package.json`, `pnpm-workspace.yaml`, `.gitignore`). Everything else belongs here.
2.  **Inheritance:** Base configurations live here and are extended by apps and packages to ensure consistency across the monorepo.
3.  **Optimization:** We've heavily optimized these configs for performance (Turbo caching, incremental TS builds, tree-shaking).

---

## 🏗 The Configuration Map

This manual documents every configuration file tracked in our system.

### 1. **`.config/`** - The Central Hub

These files are the single source of truth for tooling.

| File                         | Purpose                      | Key Customization                                                                    |
| :--------------------------- | :--------------------------- | :----------------------------------------------------------------------------------- |
| **`vitest.workspace.ts`**    | Defines test workspace scope | Uses simple export array `['apps/*', ...]` to avoid `defineWorkspace` import issues. |
| **`playwright.config.ts`**   | E2E Testing Strategy         | Configured to run tests against `apps/web` and supports CI sharding.                 |
| **`vite.web.config.ts`**     | Web Bundling Strategy        | Includes `vite-tsconfig-paths` to resolve `@/` aliases automatically.                |
| **`vite.desktop.config.ts`** | Electron/Desktop Bundling    | Specialized for Electron renderer process.                                           |
| **`tsconfig.node.json`**     | Base for Node.js apps        | Sets `module: NodeNext` for modern server/tooling support.                           |
| **`tsconfig.react.json`**    | Base for React apps          | Includes JSX settings and DOM library types.                                         |
| **`tsconfig.eslint.json`**   | ESLint Type Project          | Single project file for linting entire repo, preventing memory leaks.                |

### 2. **Root Configuration** - The Orchestrators

Files located at the repository root that manage the workspace.

| File                      | Purpose                     | Major Tweaks                                                                              |
| :------------------------ | :-------------------------- | :---------------------------------------------------------------------------------------- |
| **`package.json`**        | Workspace definition        | scripts: `type-check` uses `tsc --build` for speed; `build:headers` syncs file headers.   |
| **`pnpm-workspace.yaml`** | Package linking             | Defines `apps/*`, `backend/*`, `premium/*`, and `client/*` as members.                    |
| **`turbo.json`**          | Build Pipeline              | Configured dependencies (`^build`), output caching (`dist/**`, `.next/**`), and env vars. |
| **`eslint.config.ts`**    | Linting Rules (Flat Config) | Uses `@eslint/compat` to respect `.gitignore`. Strict TS rules enabled.                   |
| **`vitest.config.ts`**    | Test Defaults               | Minimal root config that delegates to the workspace file.                                 |
| **`tsconfig.json`**       | TS Monorepo Root            | Uses **Project References** (`references: [...]`) for incremental builds.                 |
| **`.gitignore`**          | Git Ignore patterns         | Optimized for pnpm, Turbo, and local dev environments (hybrid ignore strategy).           |

### 3. **Application Configs** (`apps/*/`)

Each application extends the base configs and adds domain-specific settings.

| App                | Key Configs              | Notes                                                                                     |
| :----------------- | :----------------------- | :---------------------------------------------------------------------------------------- |
| **`apps/server`**  | `tsconfig.json`          | Extends `tsconfig.base.json`.                                                             |
|                    | `vitest.config.ts`       | Uses `vite-tsconfig-paths` with explicit `projects: ['./tsconfig.json']` for reliability. |
| **`apps/web`**     | `vite.web.config.ts`     | (Referenced via root .config). Scripts run `vite preview` for production start.           |
| **`apps/desktop`** | `vite.desktop.config.ts` | (Referenced via root .config). Handles Electron main/renderer split.                      |

### 4. **Package Configs** (`backend/*`, `client/*`, `premium/*`)

Reusable libraries with strict build outputs.

| Category   | Packages                   | Config Pattern                                                                         |
| :--------- | :------------------------- | :------------------------------------------------------------------------------------- |
| **Core**   | `server`, `web`, `desktop` | All package `tsconfig.json` files extend `../../tsconfig.base.json`.                   |
| **Domain** | `core`, `db`, `auth`       | `package.json` exports are extremely explicit for tree-shaking (search `exports` map). |
| **UI**     | `ui`, `media`              | Use `vitest.config.ts` for unit testing component logic in isolation.                  |

---

## 🛠 Major Tweaks & "Gotchas"

### A. The "TypeScript Project References" Speed Boost

We switched the root `type-check` script to:

```bash
"type-check": "tsc --build --noEmit"
```

**Why?** This tells TypeScript to use "Incremental Builds". Instead of re-checking every file from zero, it only checks files that changed since the last `tsconfig.tsbuildinfo` was generated. This is significantly faster for large monorepos.

### B. The ESLint "Flat Config" Hybrid

We use ESLint 9's Flat Config system (`eslint.config.ts`) but added a compatibility layer:

```ts
import { includeIgnoreFile } from '@eslint/compat';
// ...
includeIgnoreFile(gitignorePath);
```

**Why?** By default, ESLint 9 doesn't auto-read `.gitignore`. This tweak ensures your linting ignores match your git ignores automatically, preventing "linting node_modules" errors.

### C. The "Docker Trap" Prevention

We strictly separate dependencies:

- **`devDependencies` (Root):** Tooling only (ESLint, Vitest, Turbo).
- **`dependencies` (App/Package):** Runtime code (Postgres, React, Fastify).
  **Why?** Docker builds often run `pnpm install --prod`. If `postgres` is in `devDependencies`, your production container will crash because the driver is missing. We've audited `apps/server` and `infra/db` to ensure they own their deps.

---

## 🏰 The "Strict by Default" Philosophy

This monorepo follows the **"Golden Standard"** of TypeScript and ESLint strictness. We believe that identifying errors at compile-time/lint-time is 100x cheaper than fixing them in production.

### 1. **Absolute Max Strictness (TypeScript)**

We use **TypeScript 5.7+** features to enforce total type safety:

- **`exactOptionalPropertyTypes`**: Prevents assigning `undefined` to an optional property that isn't explicitly typed to allow `undefined`.
- **`noPropertyAccessFromIndexSignature`**: Forces bracket notation `obj['prop']` for index signatures, preventing accidental typos.
- **`noUncheckedIndexedAccess`**: Treats array/object access as potentially `undefined`, forcing you to check bounds.
- **`verbatimModuleSyntax`**: Ensures ESM imports/exports are strictly tracked for cleaner bundling.

### 2. **Golden Standard (ESLint)**

- **Strict Boolean Expressions**: No `if (str)`. You must use `if (str !== "")`. This prevents common bugs with `0`, `false`, or empty strings.
- **Cyclic Dependency Detection**: `eslint-plugin-import-x` flags imports that circle back to themselves, preventing memory leaks.
- **Naming Conventions**: Strict `PascalCase` for types/components and `camelCase` for logic.
- **No Deprecated APIs**: Flags usage of stale functions or libraries automatically.

---

## 🔓 How to Loosen the Rules

If these rules are too "opinionated" for your taste, here is how to step down the strictness:

### A. Loosening TypeScript

Edit [tsconfig.json](file:///home/abe/projects/main/abe-stack/abe-stack-main/tsconfig.json):

- Set `strict: false` (Not recommended).
- Set `noUncheckedIndexedAccess: false` to stop checking if array indices exist.
- Remove `exactOptionalPropertyTypes` if you want to allow `undefined` as a valid value for all optional fields.

### B. Loosening ESLint

Edit [eslint.config.ts](file:///home/abe/projects/main/abe-stack/abe-stack-main/eslint.config.ts):

- **Naming Conventions**: Locate `@typescript-eslint/naming-convention` and change `'error'` to `'off'` or `'warn'`.
- **Boolean Expressions**: Search for `strict-boolean-expressions` and set to `'off'`.
- **Ignore Files**: Add paths to the `ignores: [...]` array at the top of the file to skip linting entirely for specific directories.

### C. Loosening Monorepo Boundaries

Edit [.pnpmrc](file:///home/abe/projects/main/abe-stack/abe-stack-main/.pnpmrc):

- Change `shamefully-hoist=false` to `shamefully-hoist=true`. This allows you to import packages that are not explicitly listed in your `package.json` (Phantom Dependencies).

---

## 📂 Full Directory Breakdown

This manual covers the following files (exported via `tools/scripts/export/export-config.js`):

**Root:**

- `.gitignore`, `.prettierignore`, `.prettierrc`
- `eslint.config.ts`, `package.json`, `pnpm-workspace.yaml`
- `tsconfig.json`, `turbo.json`, `vitest.config.ts`

**Config Directory (`.config/`):**

- `.editorconfig`, `playwright.config.ts`, `README.md`
- `tsconfig.eslint.json`, `tsconfig.node.json`, `tsconfig.react.json`
- `vite.desktop.config.ts`, `vite.web.config.ts`, `vitest.workspace.ts`

**Apps:**

- `apps/desktop/`: `package.json`, `tsconfig.json`, `vitest.config.ts`
- `apps/server/`: `tsconfig.json`, `vitest.config.ts`
- `apps/web/`: `package.json`, `tsconfig.json`, `vitest.config.ts`

**Packages:**

- `infra/contracts/`: `package.json`, `tsconfig.json`, `vitest.config.ts`
- `shared/core/`: `package.json`, `vitest.config.ts`
- `infra/db/`: `package.json`, `tsconfig.json`, `vitest.config.ts`
- `infra/media/`: `package.json`, `tsconfig.json`, `vitest.config.ts`
- `client/`: `package.json`, `tsconfig.json`, `vitest.config.ts`
- `client/stores/`: `package.json`, `tsconfig.json`, `vitest.config.ts`
- `shared/ui/`: `tsconfig.json`, `vitest.config.ts`
