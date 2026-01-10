# ProtectedRoute

## Overview

A generic route wrapper that checks authentication status and shows a loading state while fetching auth state. Redirects to a specified path if not authenticated. Designed to be composed with app-specific auth hooks.

## Import

```tsx
import { ProtectedRoute } from '@abe-stack/ui';
```

## Props

| Prop             | Type        | Default    | Description                                |
| ---------------- | ----------- | ---------- | ------------------------------------------ |
| isAuthenticated  | `boolean`   | (required) | Whether the user is authenticated          |
| isLoading        | `boolean`   | (required) | Whether the auth state is still loading    |
| redirectTo       | `string`    | `'/login'` | Path to redirect to when not authenticated |
| loadingComponent | `ReactNode` | -          | Custom loading component                   |
| children         | `ReactNode` | -          | Children to render when authenticated      |

## Usage

### Basic Example

```tsx
import { ProtectedRoute } from '@abe-stack/ui';

const { isAuthenticated, isLoading } = useAuth();

<ProtectedRoute isAuthenticated={isAuthenticated} isLoading={isLoading}>
  <Dashboard />
</ProtectedRoute>;
```

### With Custom Redirect

```tsx
<ProtectedRoute isAuthenticated={isAuthenticated} isLoading={isLoading} redirectTo="/signin">
  <Dashboard />
</ProtectedRoute>
```

### With Custom Loading Component

```tsx
<ProtectedRoute
  isAuthenticated={isAuthenticated}
  isLoading={isLoading}
  loadingComponent={<MyCustomSpinner />}
>
  <Dashboard />
</ProtectedRoute>
```

### With React Router Outlet

```tsx
// Use without children to render nested routes via Outlet
<Route path="/" element={<ProtectedRoute isAuthenticated={auth} isLoading={loading} />}>
  <Route path="dashboard" element={<Dashboard />} />
  <Route path="settings" element={<Settings />} />
</Route>
```

### App-Specific Wrapper Pattern

The recommended pattern is to create an app-specific wrapper that connects to your auth system:

```tsx
// apps/web/src/components/ProtectedRoute.tsx
import { ProtectedRoute as ProtectedRouteBase } from '@abe-stack/ui';
import { useAuth } from '../features/auth/useAuth';

export const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <ProtectedRouteBase isAuthenticated={isAuthenticated} isLoading={isLoading}>
      {children}
    </ProtectedRouteBase>
  );
};
```

## Behavior

- Shows loading UI when `isLoading` is true (prioritized over auth state)
- Redirects to `redirectTo` path when not authenticated
- Renders children or `<Outlet />` when authenticated
- Uses `replace` navigation to avoid back-button loops

## Accessibility

- Loading state shows text "Loading..." by default for screen readers
- Uses semantic HTML structure
- Maintains focus context through route transitions

## Do's and Don'ts

### Do

- Create app-specific wrappers that use your auth hook
- Provide meaningful loading states
- Use with React Router's nested route pattern
- Test with both authenticated and unauthenticated states

### Don't

- Don't hardcode auth logic in the component
- Don't forget to handle the loading state
- Don't use without proper auth state management
- Don't nest ProtectedRoute components unnecessarily

## Related Components

- [Spinner](./Spinner.md) - Used in default loading state
- [Text](../elements/Text.md) - Used in default loading state

## References

- [Source Code](../../src/components/ProtectedRoute.tsx)
- [Tests](../../src/components/__tests__/ProtectedRoute.test.tsx)
- [React Router Outlet](https://reactrouter.com/en/main/components/outlet)
