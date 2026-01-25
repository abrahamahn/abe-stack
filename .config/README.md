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

| File | Purpose | Key Customization |
| :--- | :--- | :--- |
| **`vitest.workspace.ts`** | Defines test workspace scope | Uses simple export array `['apps/*', ...]` to avoid `defineWorkspace` import issues. |
| **`playwright.config.ts`** | E2E Testing Strategy | Configured to run tests against `apps/web` and supports CI sharding. |
| **`vite.web.config.ts`** | Web Bundling Strategy | Includes `vite-tsconfig-paths` to resolve `@/` aliases automatically. |
| **`vite.desktop.config.ts`** | Electron/Desktop Bundling | Specialized for Electron renderer process. |
| **`tsconfig.node.json`** | Base for Node.js apps | Sets `module: NodeNext` for modern server/tooling support. |
| **`tsconfig.react.json`** | Base for React apps | Includes JSX settings and DOM library types. |
| **`tsconfig.eslint.json`** | ESLint Type Project | Single project file for linting entire repo, preventing memory leaks. |

### 2. **Root Configuration** - The Orchestrators

Files located at the repository root that manage the workspace.

| File | Purpose | Major Tweaks |
| :--- | :--- | :--- |
| **`package.json`** | Workspace definition | scripts: `type-check` uses `tsc --build` for speed; `build:headers` syncs file headers. |
| **`pnpm-workspace.yaml`** | Package linking | Defines `apps/*`, `packages/*`, and `tooling/*` as members. |
| **`turbo.json`** | Build Pipeline | Configured dependencies (`^build`), output caching (`dist/**`, `.next/**`), and env vars. |
| **`eslint.config.ts`** | Linting Rules (Flat Config) | Uses `@eslint/compat` to respect `.gitignore`. Strict TS rules enabled. |
| **`vitest.config.ts`** | Test Defaults | Minimal root config that delegates to the workspace file. |
| **`tsconfig.json`** | TS Monorepo Root | Uses **Project References** (`references: [...]`) for incremental builds. |
| **`.gitignore`** | Git Ignore patterns | Optimized for pnpm, Turbo, and local dev environments (hybrid ignore strategy). |

### 3. **Application Configs** (`apps/*/`)

Each application extends the base configs and adds domain-specific settings.

| App | Key Configs | Notes |
| :--- | :--- | :--- |
| **`apps/server`** | `tsconfig.json` | Extends `tsconfig.base.json`. |
| | `vitest.config.ts` | Uses `vite-tsconfig-paths` with explicit `projects: ['./tsconfig.json']` for reliability. |
| **`apps/web`** | `vite.web.config.ts` | (Referenced via root .config). Scripts run `vite preview` for production start. |
| **`apps/desktop`** | `vite.desktop.config.ts` | (Referenced via root .config). Handles Electron main/renderer split. |

### 4. **Package Configs** (`packages/*/`)

Reusable libraries with strict build outputs.

| Category | Packages | Config Pattern |
| :--- | :--- | :--- |
| **Core** | `server`, `web`, `desktop` | All package `tsconfig.json` files extend `../../tsconfig.base.json`. |
| **Domain** | `core`, `db`, `auth` | `package.json` exports are extremely explicit for tree-shaking (search `exports` map). |
| **UI** | `ui`, `media` | Use `vitest.config.ts` for unit testing component logic in isolation. |

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
includeIgnoreFile(gitignorePath)
```
**Why?** By default, ESLint 9 doesn't auto-read `.gitignore`. This tweak ensures your linting ignores match your git ignores automatically, preventing "linting node_modules" errors.

### C. The "Docker Trap" Prevention
We strictly separate dependencies:
- **`devDependencies` (Root):** Tooling only (ESLint, Vitest, Turbo).
- **`dependencies` (App/Package):** Runtime code (Postgres, React, Fastify).
**Why?** Docker builds often run `pnpm install --prod`. If `postgres` is in `devDependencies`, your production container will crash because the driver is missing. We've audited `apps/server` and `packages/db` to ensure they own their deps.

---

## 📂 Full Directory Breakdown

This manual covers the following files (exported via `tooling/scripts/export/export-config.js`):

**Root:**
- `.gitignore`, `.prettierignore`, `.prettierrc`
- `eslint.config.ts`, `package.json`, `pnpm-workspace.yaml`
- `tsconfig.json`, `turbo.json`, `vitest.config.ts`

**Config Directory (`.config/`):**
- `playwright.config.ts`, `README.md`
- `tsconfig.eslint.json`, `tsconfig.node.json`, `tsconfig.react.json`
- `vite.desktop.config.ts`, `vite.web.config.ts`, `vitest.workspace.ts`

**Apps:**
- `apps/desktop/`: `package.json`, `tsconfig.json`, `vitest.config.ts`
- `apps/server/`: `tsconfig.json`, `vitest.config.ts`
- `apps/web/`: `package.json`, `tsconfig.json`, `vitest.config.ts`

**Packages:**
- `packages/contracts/`: `package.json`, `tsconfig.json`, `vitest.config.ts`
- `packages/core/`: `package.json`, `vitest.config.ts`
- `packages/db/`: `package.json`, `tsconfig.json`, `vitest.config.ts`
- `packages/media/`: `package.json`, `tsconfig.json`, `vitest.config.ts`
- `packages/sdk/`: `package.json`, `tsconfig.json`, `vitest.config.ts`
- `packages/stores/`: `package.json`, `tsconfig.json`, `vitest.config.ts`
- `packages/ui/`: `tsconfig.json`, `vitest.config.ts`
