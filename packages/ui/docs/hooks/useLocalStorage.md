# useLocalStorage

## Overview

Persists state to localStorage with SSR safety and cross-tab synchronization. Works like useState but survives page refreshes.

## Import

```tsx
import { useLocalStorage } from '@abe-stack/ui';
```

## Signature

```tsx
function useLocalStorage<T>(
  key: string,
  initialValue: T,
): [T, (value: T | ((prev: T) => T)) => void];
```

## Parameters

| Parameter    | Type     | Description                        |
| ------------ | -------- | ---------------------------------- |
| key          | `string` | localStorage key                   |
| initialValue | `T`      | Initial value if key doesn't exist |

## Returns

| Index | Type                                  | Description          |
| ----- | ------------------------------------- | -------------------- |
| 0     | `T`                                   | Current stored value |
| 1     | `(value: T \| ((prev) => T)) => void` | Setter function      |

## Usage

### Basic Example

```tsx
function Settings() {
  const [theme, setTheme] = useLocalStorage('theme', 'light');

  return (
    <select value={theme} onChange={(e) => setTheme(e.target.value)}>
      <option value="light">Light</option>
      <option value="dark">Dark</option>
    </select>
  );
}
```

### With Objects

```tsx
function UserPreferences() {
  const [prefs, setPrefs] = useLocalStorage('user-prefs', {
    notifications: true,
    language: 'en',
  });

  const toggleNotifications = () => {
    setPrefs((prev) => ({
      ...prev,
      notifications: !prev.notifications,
    }));
  };

  return (
    <button onClick={toggleNotifications}>
      Notifications: {prefs.notifications ? 'On' : 'Off'}
    </button>
  );
}
```

### Panel Configuration

```tsx
function Workspace() {
  const [panels, setPanels] = useLocalStorage('panel-sizes', {
    left: 20,
    right: 25,
  });

  return (
    <ResizablePanel
      sizes={[panels.left, 100 - panels.left - panels.right, panels.right]}
      onResize={(sizes) =>
        setPanels({
          left: sizes[0],
          right: sizes[2],
        })
      }
    />
  );
}
```

## Behavior

- SSR-safe (returns initialValue on server)
- Syncs across tabs/windows via storage event
- Silently fails if localStorage unavailable
- JSON serializes values automatically

## Do's and Don'ts

### Do

- Use for user preferences and settings
- Provide sensible initial values
- Keep stored data small and serializable

### Don't

- Store sensitive data (not secure)
- Store large amounts of data (5MB limit)
- Store non-serializable values (functions, DOM nodes)

## Related Hooks

- [usePanelConfig](./usePanelConfig.md) - Panel layout persistence
- [useThemeMode](./useThemeMode.md) - Theme persistence

## References

- [Source Code](../../src/hooks/useLocalStorage.ts)
