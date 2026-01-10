# ThemeProvider

Wraps your app to provide theme context and styling. Manages light/dark mode with localStorage persistence.

## Import

```tsx
import { ThemeProvider, useTheme } from '@abe-stack/ui';
```

## Usage

```tsx
// Wrap your app with ThemeProvider
function App() {
  return (
    <ThemeProvider>
      <YourApp />
    </ThemeProvider>
  );
}

// Access theme in child components
function ThemeToggle() {
  const { mode, cycleMode, isDark } = useTheme();
  return <button onClick={cycleMode}>{isDark ? 'Dark' : 'Light'} Mode</button>;
}
```

## ThemeProvider Props

| Prop          | Type        | Default        | Description                       |
| ------------- | ----------- | -------------- | --------------------------------- |
| `children`    | `ReactNode` | -              | Content to render within provider |
| `storageKey`  | `string`    | `"theme-mode"` | localStorage key for persistence  |
| `defaultMode` | `ThemeMode` | `"system"`     | Default mode if none stored       |

## useTheme Return Value

| Property        | Type                            | Description                              |
| --------------- | ------------------------------- | ---------------------------------------- |
| `mode`          | `"system" \| "light" \| "dark"` | Current theme mode setting               |
| `resolvedTheme` | `"light" \| "dark"`             | Actual theme after resolving system pref |
| `isDark`        | `boolean`                       | Whether resolved theme is dark           |
| `isLight`       | `boolean`                       | Whether resolved theme is light          |
| `setMode`       | `(mode: ThemeMode) => void`     | Set theme mode directly                  |
| `cycleMode`     | `() => void`                    | Cycle through: system -> light -> dark   |

## Notes

- Applies `data-theme` attribute to `<html>` for CSS targeting
- Syncs with system preference when mode is `"system"`
- Persists preference to localStorage
- Must wrap components that use `useTheme()`
