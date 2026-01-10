# useHistoryNav

## Overview

A React hook and provider that tracks browser history state within your app, providing `goBack`/`goForward` functions along with `canGoBack`/`canGoForward` indicators. Wraps React Router's navigation to maintain a local history stack.

## Import

```tsx
import { HistoryProvider, useHistoryNav } from '@abe-stack/ui';
```

## HistoryProvider

The provider component that wraps your app and tracks navigation history.

### Props

| Prop     | Type        | Default    | Description         |
| -------- | ----------- | ---------- | ------------------- |
| children | `ReactNode` | (required) | App content to wrap |

## useHistoryNav Hook

The hook that provides access to history state and navigation functions.

### Return Value

| Property     | Type         | Description                                   |
| ------------ | ------------ | --------------------------------------------- |
| history      | `string[]`   | Array of visited paths                        |
| index        | `number`     | Current position in history (-1 if empty)     |
| canGoBack    | `boolean`    | Whether there's a previous page to go back to |
| canGoForward | `boolean`    | Whether there's a next page to go forward to  |
| goBack       | `() => void` | Navigate to the previous page                 |
| goForward    | `() => void` | Navigate to the next page                     |

## Usage

### Setup Provider

The `HistoryProvider` must be placed inside a React Router context:

```tsx
import { BrowserRouter } from 'react-router-dom';
import { HistoryProvider } from '@abe-stack/ui';

function App() {
  return (
    <BrowserRouter>
      <HistoryProvider>
        <Routes>{/* Your routes */}</Routes>
      </HistoryProvider>
    </BrowserRouter>
  );
}
```

### Basic Usage

```tsx
import { useHistoryNav } from '@abe-stack/ui';

function NavigationButtons() {
  const { canGoBack, canGoForward, goBack, goForward } = useHistoryNav();

  return (
    <nav>
      <button onClick={goBack} disabled={!canGoBack}>
        Back
      </button>
      <button onClick={goForward} disabled={!canGoForward}>
        Forward
      </button>
    </nav>
  );
}
```

### Browser-Style Navigation Bar

```tsx
function BrowserNav() {
  const { canGoBack, canGoForward, goBack, goForward, history, index } = useHistoryNav();

  return (
    <div className="browser-nav">
      <button onClick={goBack} disabled={!canGoBack} aria-label="Go back">
        ←
      </button>
      <button onClick={goForward} disabled={!canGoForward} aria-label="Go forward">
        →
      </button>
      <span className="location">{history[index]}</span>
    </div>
  );
}
```

### With Keyboard Shortcuts

```tsx
import { useHistoryNav } from '@abe-stack/ui';
import { useKeyboardShortcuts } from '@abe-stack/ui';

function App() {
  const { goBack, goForward, canGoBack, canGoForward } = useHistoryNav();

  useKeyboardShortcuts([
    {
      key: 'ArrowLeft',
      modifiers: ['alt'],
      handler: () => canGoBack && goBack(),
    },
    {
      key: 'ArrowRight',
      modifiers: ['alt'],
      handler: () => canGoForward && goForward(),
    },
  ]);

  return <div>{/* App content */}</div>;
}
```

## Behavior

- Tracks all navigation within the React Router context
- Maintains its own history stack separate from browser history
- `goBack`/`goForward` use React Router's navigate function
- Handles redirect landing pages by preserving previous entries
- History is reset on page refresh (client-side only)

## Error Handling

The hook throws an error if used outside of `HistoryProvider`:

```tsx
// This will throw: "useHistoryNav must be used within HistoryProvider"
function BadComponent() {
  const nav = useHistoryNav(); // Error!
  return <div />;
}
```

## Do's and Don'ts

### Do

- Wrap your app with `HistoryProvider` inside React Router
- Check `canGoBack`/`canGoForward` before calling navigation
- Use for in-app navigation controls
- Combine with keyboard shortcuts for better UX

### Don't

- Don't use outside of `HistoryProvider`
- Don't rely on history persisting across page refreshes
- Don't use for authentication-related redirects (use router directly)
- Don't call `goBack`/`goForward` when disabled

## Related Components

- [ProtectedRoute](../components/ProtectedRoute.md) - Route protection with redirect handling

## References

- [Source Code](../../src/hooks/useHistoryNav.tsx)
- [Tests](../../src/hooks/__tests__/useHistoryNav.test.tsx)
- [React Router useNavigate](https://reactrouter.com/en/main/hooks/use-navigate)
