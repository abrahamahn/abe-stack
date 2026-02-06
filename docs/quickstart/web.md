# Quickstart: Web App

Vite + React 19 frontend. Services initialize before React renders -- no race conditions, no provider nesting.

---

## Prerequisites

- Monorepo installed (`pnpm install` from root)
- Server running for API calls (or use in standalone mode with mocked data)

---

## Start

**With full stack** (recommended):

```bash
# From monorepo root
pnpm dev
```

**Standalone** (web only):

```bash
pnpm --filter @abe-stack/web dev
```

Opens at http://localhost:5173. Vite proxies `/api` requests to the backend on port 8080.

---

## Commands

```bash
pnpm --filter @abe-stack/web dev         # Development with HMR
pnpm --filter @abe-stack/web build       # Production build
pnpm --filter @abe-stack/web preview     # Preview production build
pnpm --filter @abe-stack/web test        # Run tests
pnpm --filter @abe-stack/web type-check  # TypeScript checking
pnpm --filter @abe-stack/web lint        # Lint
```

---

## Key Concepts

### ClientEnvironment

All services live in one object, created before React renders:

```typescript
// main.tsx
const environment: ClientEnvironment = { config, queryClient, auth };
root.render(<App environment={environment} />);

// Any component
const { auth, config } = useClientEnvironment();
```

No context nesting. One provider. Token refresh starts at boot, not on mount.

### Path Aliases

Auto-generated. No `../../../` imports:

```typescript
import { useAuth } from '@hooks'; // src/features/auth/hooks
import { LoginForm } from '@components'; // src/features/auth/components
import { clientConfig } from '@config'; // src/config
```

New aliases are auto-created when you add directories with `index.ts` (max 3 levels from `src/`).

### API Integration

```typescript
// In services (outside React)
import { api } from '@api/client';
const user = await api.getCurrentUser();

// In components (React Query)
import { useApi } from '@api/ApiProvider';
const api = useApi();
```

Both are type-safe via ts-rest contracts from `@abe-stack/shared`.

---

## Routes

All routes are lazy-loaded (automatic code splitting):

| Route                  | Page              | Auth Required |
| ---------------------- | ----------------- | ------------- |
| `/`                    | HomePage          | No            |
| `/login`               | LoginPage         | No            |
| `/register`            | RegisterPage      | No            |
| `/auth`                | AuthPage          | No            |
| `/auth/reset-password` | ResetPasswordPage | No            |
| `/auth/confirm-email`  | ConfirmEmailPage  | No            |
| `/ui-library`          | UILibraryPage     | No            |
| `/dashboard`           | DashboardPage     | Yes           |

---

## Project Structure

```
apps/web/src/
├── main.tsx              # Entry: creates services, renders App
├── app/                  # App shell + ClientEnvironment
├── api/                  # API client + React Query provider
├── config/               # Client configuration
├── features/
│   ├── auth/             # Login, register, password reset, email verify
│   ├── dashboard/        # Protected dashboard
│   └── demo/             # Interactive UI component catalog
├── pages/                # Top-level page components
└── public/               # PWA assets (manifest, service worker, icons)
```

Organized by **feature**, not by type.

---

## Configuration

Only one env var matters for the frontend:

| Variable       | Default       | Purpose          |
| -------------- | ------------- | ---------------- |
| `VITE_API_URL` | (empty/proxy) | API URL override |

Empty means Vite's dev proxy handles API routing to `localhost:8080`.

---

## Dependencies

| Package                    | Role                      |
| -------------------------- | ------------------------- |
| `@abe-stack/shared`        | Types, validation, stores |
| `@abe-stack/ui`            | React components          |
| `@abe-stack/client-engine` | API client + React Query  |

The web app is a thin rendering layer. Business logic lives in packages.

---

## Next Steps

- Visit `/ui-library` to explore all 57 UI components
- Read the full [Web README](../../apps/web/README.md) for architecture details
- See [Architecture](../specs/architecture.md) for the hexagonal dependency model
