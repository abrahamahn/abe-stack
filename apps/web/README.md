# ABE Stack Web Application

This is the frontend React application for ABE Stack. Before we dive into the code, let us talk about the philosophy that shapes how this application is organized.

## Table of Contents

- [Philosophy: Services Before React](#philosophy-services-before-react)
- [The ClientEnvironment Pattern](#the-clientenvironment-pattern)
- [Directory Structure](#directory-structure)
- [How Routing Works](#how-routing-works)
- [Authentication Flow](#authentication-flow)
- [Token Management](#token-management)
- [API Integration](#api-integration)
- [Development](#development)
- [Path Aliases](#path-aliases)
- [Environment Variables](#environment-variables)
- [Building for Production](#building-for-production)
- [Progressive Web App Support](#progressive-web-app-support)
- [The Demo Feature](#the-demo-feature)
- [Design Decisions and Trade-offs](#design-decisions-and-trade-offs)
- [Package Dependencies](#package-dependencies)
- [Testing](#testing)

---

## Philosophy: Services Before React

The most important decision we made in this codebase is that **services are created before React renders**. This might seem like a minor detail, but it fundamentally changes how the application works.

In a typical React app, you might see something like this:

```tsx
// The typical approach - services created inside React tree
function App() {
  const [queryClient] = useState(() => new QueryClient());
  const [authService] = useState(() => new AuthService(queryClient));

  return <Providers queryClient={queryClient}>...</Providers>;
}
```

We do it differently. Look at `src/main.tsx`:

```tsx
// Our approach - services created at module level
const queryClient = new QueryClient({ ... })
const auth = createAuthService({ config: clientConfig, queryClient })

const environment: ClientEnvironment = { config: clientConfig, queryClient, auth }

// THEN React renders
root.render(<App environment={environment} />)
```

Why does this matter? Because services exist before the React lifecycle begins. The auth service can start initializing immediately. Token refresh can begin before any component mounts. The application boots faster and there are no race conditions between service initialization and component rendering.

This pattern comes from chet-stack and we have found it to be remarkably effective for managing complex client-side state.

## The ClientEnvironment Pattern

Instead of multiple nested providers each wrapping the next, we use a single `ClientEnvironment` object that holds all our services:

```tsx
type ClientEnvironment = {
  config: ClientConfig;
  queryClient: QueryClient;
  auth: AuthService;
  // Future: pubsub, offlineQueue, etc.
};
```

This object is passed to the `App` component and made available via context. Any component can access any service through the `useClientEnvironment` hook:

```tsx
function SomeComponent() {
  const { auth, config } = useClientEnvironment();
  // Use services directly
}
```

The benefits are substantial:

1. **Testing becomes trivial** - Mock one object instead of wrestling with multiple provider wrappers
2. **Dependencies are explicit** - You can see exactly what a component needs
3. **No provider hell** - One provider instead of QueryClientProvider inside AuthProvider inside ConfigProvider inside...

## Directory Structure

```
src/
├── main.tsx              # Entry point - creates services, renders App
├── app/
│   ├── App.tsx           # Root component with providers and routes
│   └── ClientEnvironment.tsx  # Environment type and provider
├── api/
│   ├── ApiProvider.tsx   # React Query API client provider
│   └── client.ts         # Standalone API client instance
├── config/
│   └── index.ts          # Centralized client configuration
├── features/
│   ├── auth/             # Authentication feature
│   │   ├── components/   # AuthModal, LoginForm, etc.
│   │   ├── hooks/        # useAuth, useAuthFormState
│   │   ├── pages/        # AuthPage, LoginPage, etc.
│   │   └── services/     # AuthService class
│   ├── dashboard/        # Protected dashboard feature
│   │   └── pages/        # DashboardPage
│   └── demo/             # Component showcase feature
│       ├── catalog/      # Component registry
│       ├── components/   # Demo UI components
│       ├── hooks/        # useDemoTheme, useDemoPanes
│       └── pages/        # DemoPage
├── pages/
│   └── HomePage.tsx      # Landing page
└── utils/
    └── registerServiceWorker.ts  # PWA service worker setup
```

We organize by feature, not by type. The `auth` folder contains everything related to authentication - its components, hooks, pages, and services all live together. This makes it easy to understand a feature by looking at one directory rather than hunting across `components/`, `hooks/`, and `services/` folders.

## How Routing Works

Routes are defined in `App.tsx`, inline and explicit:

```tsx
function AppRoutes(): ReactElement {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/auth/reset-password" element={<ResetPasswordPage />} />
      <Route path="/auth/confirm-email" element={<ConfirmEmailPage />} />
      <Route path="/demo" element={<DemoPage />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
```

We deliberately chose not to use file-based routing. Why? Because explicit routes are easier to understand, refactor, and debug. You can see all routes in one place. When you need to add a route, you add it here. There is no magic.

Protected routes use the `ProtectedRoute` component, which checks authentication state and redirects to `/login` if needed:

```tsx
export const ProtectedRoute = ({ children }: { children?: ReactNode }): ReactElement => {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <ProtectedRouteBase isAuthenticated={isAuthenticated} isLoading={isLoading} redirectTo="/login">
      {children}
    </ProtectedRouteBase>
  );
};
```

## Authentication Flow

Authentication is handled by the `AuthService` class in `src/features/auth/services/AuthService.ts`. This is a plain TypeScript class, not a React hook or context - it can be used anywhere.

The flow works like this:

1. On app startup, `auth.initialize()` is called (see `main.tsx`)
2. This checks if there is an existing session by attempting a token refresh
3. If refresh succeeds, the user is automatically logged in
4. If not, the user remains logged out (this is fine - they will log in when needed)

The auth service manages:

- Login/logout operations
- Registration with email verification
- Password reset flow
- Token refresh with exponential backoff
- State synchronization with React Query

Components access auth state through the `useAuth` hook:

```tsx
function MyComponent() {
  const { user, isAuthenticated, isLoading, login, logout } = useAuth();

  if (isLoading) return <Loading />;
  if (!isAuthenticated) return <LoginPrompt />;

  return <UserProfile user={user} />;
}
```

The hook subscribes to auth service changes, so your component re-renders when auth state changes.

## Token Management

Tokens are stored in memory by default. This means:

- Tokens are cleared on page refresh (intentional for security)
- The refresh token (stored in an HTTP-only cookie) is used to restore sessions
- Token refresh runs automatically every 13 minutes
- If refresh fails, exponential backoff kicks in (2x delay each failure, max 5 minutes)

This design prioritizes security over convenience. You cannot XSS steal tokens from memory as easily as from localStorage.

## API Integration

We provide two ways to call the API:

### 1. The API Client (for services)

```tsx
import { api } from '@api/client';

// Used by AuthService and other services
const user = await api.getCurrentUser();
```

### 2. The ApiProvider (for components)

```tsx
import { useApi } from '@api/ApiProvider';

function MyComponent() {
  const api = useApi();
  // Use with React Query hooks
}
```

Both use the SDK's `createApiClient` and `createReactQueryClient` under the hood, which are type-safe wrappers around ts-rest.

The API URL is configured in `src/config/index.ts`. In development, it defaults to empty string which means relative URLs - Vite proxies `/api` requests to the backend server.

## Development

Start the development server:

```bash
pnpm dev
```

This runs Vite on port 5173 with hot module replacement. The dev server proxies API requests to `localhost:8080`:

```ts
// From config/vite.web.config.ts
server: {
  proxy: {
    '/api': { target: 'http://localhost:8080', changeOrigin: true },
    '/ws': { target: 'ws://localhost:8080', ws: true },
    '/uploads': { target: 'http://localhost:8080', changeOrigin: true },
  },
}
```

Run type checking:

```bash
pnpm type-check
```

Run tests:

```bash
pnpm test
```

Run tests in watch mode:

```bash
pnpm test:watch
```

## Path Aliases

We use path aliases extensively to avoid deep relative imports. Instead of:

```tsx
import { useAuth } from '../../../features/auth/hooks/useAuth';
```

You write:

```tsx
import { useAuth } from '@auth/hooks';
```

The aliases are defined in `tsconfig.json` and automatically configured for Vite. Here are the main ones:

| Alias       | Path                  |
| ----------- | --------------------- |
| `@`         | `./src/*`             |
| `@api`      | `./src/api`           |
| `@app`      | `./src/app`           |
| `@auth`     | `./src/features/auth` |
| `@config`   | `./src/config`        |
| `@demo`     | `./src/features/demo` |
| `@features` | `./src/features`      |
| `@pages`    | `./src/pages`         |

Path aliases are auto-generated by the monorepo's dev tooling when you create new directories with `index.ts` files.

## Environment Variables

The only required environment variable is:

| Variable       | Description  | Default                    |
| -------------- | ------------ | -------------------------- |
| `VITE_API_URL` | API base URL | Empty (uses relative URLs) |

In development, leave it empty - Vite proxies to the backend. In production, set it to your API domain.

Access config through the centralized config module:

```tsx
import { clientConfig } from '@config';

console.log(clientConfig.apiUrl); // API URL
console.log(clientConfig.isDev); // true in development
console.log(clientConfig.isProd); // true in production
```

## Building for Production

```bash
pnpm build
```

This outputs to `dist/`. The build is optimized with:

- Tree shaking (unused code removed)
- Code splitting (routes loaded on demand)
- Asset hashing (cache busting)

Preview the production build locally:

```bash
pnpm preview
```

## Progressive Web App Support

The app includes PWA support with a service worker for offline asset caching. The service worker is registered in production only (it interferes with HMR in development).

Key files:

- `public/sw.js` - The service worker
- `public/manifest.json` - PWA manifest
- `src/utils/registerServiceWorker.ts` - Registration utility with lifecycle management

The service worker provides:

- Offline asset caching
- Update detection with callbacks
- Cache versioning and cleanup

## The Demo Feature

The demo page (`/demo`) is a component showcase that displays all UI components from `@abe-stack/ui`. It is useful for:

- Exploring available components
- Testing theme variants
- Copying component code

The demo uses a catalog system defined in `src/features/demo/catalog/` where each component is registered with variants, descriptions, and example code.

## Design Decisions and Trade-offs

### Why no file-based routing?

We tried it. It was magical until we needed to debug why a route was not working. Explicit routes in one file are easier to understand and refactor.

### Why class-based AuthService instead of hooks?

Hooks are great for React components, but auth logic needs to run outside React (on app boot, in service workers, etc.). A class gives us that flexibility while still being easy to use via the `useAuth` hook.

### Why memory-based token storage?

Security. LocalStorage is vulnerable to XSS. Memory tokens cannot be stolen by malicious scripts. The trade-off is users need to re-authenticate on page refresh, but the refresh token in HTTP-only cookies handles this automatically.

### Why one ClientEnvironment instead of multiple contexts?

Simpler testing, clearer dependencies, no provider nesting. The cost is one large context, but we have not found this to be a problem in practice.

### Why Zustand for toasts instead of React context?

Toasts need to be triggered from outside React (API error handlers, service workers). Zustand stores work anywhere. The toast store is defined in `@abe-stack/core` so both web and server can use it.

## Package Dependencies

This app depends on three internal packages:

- `@abe-stack/core` - Shared types, validation, stores
- `@abe-stack/ui` - React components
- `@abe-stack/sdk` - API client and React Query hooks

External dependencies are minimal:

- React 19 with react-router-dom v7
- TanStack Query (React Query) for server state
- Zustand for client state
- DOMPurify and react-markdown for safe markdown rendering

## Testing

Tests live in `__tests__/` directories next to the code they test. We use Vitest with React Testing Library.

Run all tests:

```bash
pnpm test
```

Run a specific test file:

```bash
pnpm test -- --run src/features/auth/hooks/__tests__/useAuth.test.tsx
```

Tests should verify behavior, not implementation. A good test for a form checks that submitting with valid data calls the right function, not that internal state updates correctly.

## Further Reading

- [Architecture documentation](../../docs/dev/architecture.md) - How the monorepo is organized
- [Testing strategy](../../docs/dev/testing.md) - How we approach testing
- [Design principles](../../docs/dev/principles.md) - Patterns and anti-patterns

---

_Last Updated: 2026-01-21_
