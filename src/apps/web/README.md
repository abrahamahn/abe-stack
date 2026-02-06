# ABE Stack Web

> Services before React.

Vite + React 19 frontend. The key insight: services are created before React renders. No race conditions between initialization and component mounting. Auth service starts refreshing tokens before any component mounts. The app boots faster.

## Features

- services initialized before React 🚀
- single ClientEnvironment (no provider hell) 📦
- cookie-based auth with auto-refresh 🍪
- type-safe API client (ts-rest + React Query) 🔒
- PWA with offline caching 📱
- interactive UI library component catalog 🎨
- query cache persistence (IndexedDB) 💾
- lazy-loaded routes (code splitting) ⚡
- 48 test files passing ✅

## Getting Started

```sh
# from monorepo root
pnpm dev

# standalone
pnpm --filter @abe-stack/web dev
```

Vite runs on port 5173, proxies `/api` to the backend on 8080.

## Commands

```sh
pnpm --filter @abe-stack/web dev        # development (HMR)
pnpm --filter @abe-stack/web build      # production build
pnpm --filter @abe-stack/web preview    # preview production build
pnpm --filter @abe-stack/web test       # run tests
pnpm --filter @abe-stack/web type-check # check types
```

## Architecture

```typescript
// main.tsx - services created BEFORE React renders
const queryClient = new QueryClient({ ... });
const auth = createAuthService({ config, queryClient });

const environment: ClientEnvironment = { config, queryClient, auth };

// THEN React renders
root.render(<App environment={environment} />);
```

**Why this matters:**

- Auth initializes immediately (no waiting for component mount)
- Token refresh starts before UI renders
- No race conditions
- Testing is trivial (mock one object)

### The ClientEnvironment Pattern

One object holds all services. One provider. No nesting.

```typescript
type ClientEnvironment = {
  config: ClientConfig;
  queryClient: QueryClient;
  auth: AuthService;
};

// Any component can access any service
function MyComponent() {
  const { auth, config } = useClientEnvironment();
}
```

## Features

### Auth (`src/features/auth/`)

Complete authentication UI with all flows.

| Feature            | Implementation                                   |
| ------------------ | ------------------------------------------------ |
| Login/Register     | Forms with validation                            |
| Token Management   | Memory storage (XSS-safe)                        |
| Auto-refresh       | Every 13 min with exponential backoff            |
| Protected Routes   | `<ProtectedRoute>` component                     |
| Password Reset     | Full flow with email                             |
| Email Verification | Confirmation page with resend (60s cooldown)     |
| Auth Modal         | Unified modal supporting all auth modes          |
| Form Modes         | login, register, forgot-password, reset-password |

```typescript
const { user, isAuthenticated, isLoading, login, logout } = useAuth();
```

**Components:**

- `AuthModal` - Unified modal for all auth flows
- `AuthForm` - Router component that renders the correct form based on mode
- `LoginForm`, `RegisterForm`, `ForgotPasswordForm`, `ResetPasswordForm`
- `ProtectedRoute` - Redirect to login if not authenticated

**Hooks:**

- `useAuth` - Main auth hook with user state and methods
- `useAuthFormState` - Form state management with loading/error
- `useResendCooldown` - 60-second cooldown for email resend

### Dashboard (`src/features/dashboard/`)

Protected area for authenticated users.

### UI Library (`src/features/ui-library/`)

Interactive component catalog at `/ui-library`. Displays all `@abe-stack/ui` components with:

- Live examples with theme switching
- Code snippets
- Resizable pane layout (keyboard shortcuts: T/B/L/R/D/C)
- Three categories: components (11), elements (38), layouts (8)
- Lazy-loaded documentation
- Auth integration (can test login/register flows)

## Project Structure

```
src/
├── main.tsx                  # entry - creates services, renders App
├── app/
│   ├── App.tsx               # routes + providers + query persistence
│   └── ClientEnvironment.tsx # environment type + context
├── api/
│   ├── client.ts             # standalone API client
│   └── ApiProvider.tsx       # React Query integration
├── config/
│   └── index.ts              # client configuration
├── features/
│   ├── auth/                 # authentication
│   │   ├── components/       # LoginForm, AuthModal, RegisterForm, etc.
│   │   ├── hooks/            # useAuth, useAuthFormState, useResendCooldown
│   │   ├── pages/            # LoginPage, RegisterPage, ResetPasswordPage, ConfirmEmailPage
│   │   ├── services/         # AuthService class
│   │   └── utils/            # createFormHandler
│   ├── dashboard/            # protected dashboard
│   │   └── pages/            # Dashboard (protected route)
│   ├── ui-library/            # interactive component catalog
│   │   ├── catalog/          # componentCatalog, elementCatalog, layoutCatalog
│   │   ├── components/       # UILibraryTopBar, UILibraryBottomBar, UILibraryMainLayout, etc.
│   │   ├── hooks/            # useUILibraryKeyboard, useUILibraryTheme, useUILibraryPanes
│   │   ├── pages/            # UILibraryPage
│   │   ├── types/            # ComponentDemo types
│   │   └── utils/            # lazyDocs
│   └── notifications/        # (empty - future feature)
├── pages/
│   └── HomePage.tsx          # landing page
├── utils/
│   └── registerServiceWorker.ts # PWA service worker registration
└── public/
    ├── sw.js                 # service worker with push notification support
    ├── manifest.json         # PWA manifest
    └── icons/                # PWA icons (192, 512, apple-touch, favicon)
```

**Organized by feature**, not by type. Everything about auth lives in `features/auth/`.

## Routes

All routes are lazy-loaded for optimal code splitting:

```tsx
// Explicit routes in App.tsx - no magic
<Routes>
  <Route path="/" element={<HomePage />} />
  <Route path="/login" element={<LoginPage />} />
  <Route path="/register" element={<RegisterPage />} />
  <Route path="/auth" element={<AuthPage />} />
  <Route path="/auth/reset-password" element={<ResetPasswordPage />} />
  <Route path="/auth/confirm-email" element={<ConfirmEmailPage />} />
  <Route path="/ui-library" element={<UILibraryPage />} />
  <Route
    path="/dashboard"
    element={
      <ProtectedRoute>
        <DashboardPage />
      </ProtectedRoute>
    }
  />
  <Route path="/clean" element={<HomePage />} />
</Routes>
```

All pages are lazy-loaded using `React.lazy()` for automatic code splitting.

## API Integration

Two ways to call the API:

```typescript
// 1. Standalone client (for services)
import { api } from '@api/client';
const user = await api.getCurrentUser();

// 2. React Query hooks (for components)
import { useApi } from '@api/ApiProvider';
const api = useApi();
```

Both are type-safe wrappers around ts-rest.

## Path Aliases

Auto-generated. No deep relative imports.

```typescript
// Instead of '../../../features/auth/hooks/useAuth'
import { useAuth } from '@auth/hooks';
```

| Alias         | Path                                |
| ------------- | ----------------------------------- |
| `@`           | `./src/*`                           |
| `@api`        | `./src/api`                         |
| `@app`        | `./src/app`                         |
| `@auth`       | `./src/features/auth`               |
| `@catalog`    | `./src/features/ui-library/catalog` |
| `@components` | `./src/features/auth/components`    |
| `@config`     | `./src/config`                      |
| `@dashboard`  | `./src/features/dashboard`          |
| `@ui-library` | `./src/features/ui-library`         |
| `@features`   | `./src/features`                    |
| `@hooks`      | `./src/features/auth/hooks`         |
| `@pages`      | `./src/pages`                       |
| `@services`   | `./src/features/auth/services`      |

## Configuration

```typescript
import { clientConfig } from '@config';

clientConfig.apiUrl; // API URL (empty = relative, Vite proxies)
clientConfig.isDev; // true in development
clientConfig.isProd; // true in production
clientConfig.mode; // environment mode (development, production, test)
clientConfig.tokenRefreshInterval; // 13 minutes (780000ms)
clientConfig.uiVersion; // UI version string
```

Only env var: `VITE_API_URL` (optional, defaults to relative URLs).

## UI Library Catalog Components

The `/ui-library` route showcases 57 components across 3 categories:

**Components (11):**
Box, Button, Card, Input, Spinner, AppShell, Badge, FormField, LoadingContainer, ToastContainer

**Elements (38):**
Accordion, Alert, Avatar, Card (structured), Checkbox, Divider, Dropdown, Heading, MenuItem, Modal, Overlay, Pagination, Popover, Progress, Radio, RadioGroup, Select, Skeleton, Slider, Switch, Tabs, Text, VisuallyHidden, TextArea, Tooltip, Table, Toast, ResizablePanel, ScrollArea, Dialog, Image, CloseButton, EnvironmentBadge, Kbd, PasswordInput, Toaster, VersionBadge

**Layouts (8):**
Container, AuthLayout, PageContainer, LeftSidebarLayout (with AppShell), StackedLayout, TopbarLayout, BottombarLayout, RightSidebarLayout

Each component demo includes:

- Multiple variants showing different props/states
- Live render preview
- Code snippet for copy/paste
- Description of use case

## PWA Support

Full PWA support with offline capabilities (production only).

- `public/sw.js` - service worker with push notification support
- `public/manifest.json` - PWA manifest with app metadata
- `public/icons/` - complete icon set (favicon, apple-touch-icon, 192x192, 512x512)
- `src/utils/registerServiceWorker.ts` - registration with lifecycle hooks
- Service worker registers on page load (non-blocking)
- Callbacks for success, update, and error events

## Query Cache Persistence

React Query cache persisted to IndexedDB (24-hour max age):

- Automatic restoration on app load
- Throttled persistence (1 second) on cache updates
- Manual persistence management (no PersistQueryClientProvider)
- Hooks into React Query cache subscription
- Survives page refreshes and browser restarts

## Trade-offs

**Why services before React?**

- No race conditions, faster boot, easier testing

**Why class-based AuthService?**

- Runs outside React (app boot, service workers)

**Why memory tokens instead of localStorage?**

- XSS-safe. Refresh token in HTTP-only cookie handles persistence.

**Why one ClientEnvironment?**

- One provider, clear dependencies, trivial testing

**Why explicit routes?**

- Easier to debug than file-based magic

**Why lazy routes?**

- Automatic code splitting, faster initial load, better performance

**Why manual query persistence?**

- Full control over persistence timing, no extra provider wrapping

## Dependencies

**Internal:**

- `@abe-stack/shared` - types, validation, stores
- `@abe-stack/ui` - React components
- `@abe-stack/engine` - API client + React Query hooks

**External:**

- React 19 + custom router (via @abe-stack/ui)
- TanStack Query (React Query)
- Vite

---

[Read the detailed docs](../../docs) for architecture decisions, development workflows, and contribution guidelines.
