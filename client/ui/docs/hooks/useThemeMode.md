# useThemeMode

## Overview

Manages theme mode (light/dark/system) with localStorage persistence and automatic application to the document root. Handles system preference detection.

## Import

```tsx
import { useThemeMode } from '@abe-stack/ui';
```

## Signature

```tsx
function useThemeMode(storageKey?: string): UseThemeModeReturn;
```

## Types

```tsx
type ThemeMode = 'system' | 'light' | 'dark';

type UseThemeModeReturn = {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  cycleMode: () => void;
  isDark: boolean;
  isLight: boolean;
  resolvedTheme: 'light' | 'dark';
};
```

## Parameters

| Parameter  | Type     | Default        | Description      |
| ---------- | -------- | -------------- | ---------------- |
| storageKey | `string` | `'theme-mode'` | localStorage key |

## Returns

| Property      | Type                        | Description                       |
| ------------- | --------------------------- | --------------------------------- |
| mode          | `ThemeMode`                 | Current mode setting              |
| setMode       | `(mode: ThemeMode) => void` | Set the theme mode                |
| cycleMode     | `() => void`                | Cycle: system -> light -> dark    |
| isDark        | `boolean`                   | Whether resolved theme is dark    |
| isLight       | `boolean`                   | Whether resolved theme is light   |
| resolvedTheme | `'light' \| 'dark'`         | Resolved theme after system check |

## Usage

### Theme Toggle Button

```tsx
function ThemeToggle() {
  const { mode, cycleMode, isDark } = useThemeMode();

  return (
    <button onClick={cycleMode}>
      {isDark ? <SunIcon /> : <MoonIcon />}
      {mode === 'system' ? 'System' : mode}
    </button>
  );
}
```

### Theme Selector

```tsx
function ThemeSelector() {
  const { mode, setMode } = useThemeMode();

  return (
    <select value={mode} onChange={(e) => setMode(e.target.value as ThemeMode)}>
      <option value="system">System</option>
      <option value="light">Light</option>
      <option value="dark">Dark</option>
    </select>
  );
}
```

### Conditional Rendering

```tsx
function Logo() {
  const { isDark } = useThemeMode();

  return <img src={isDark ? '/logo-dark.svg' : '/logo-light.svg'} alt="Logo" />;
}
```

### With Settings Panel

```tsx
function SettingsPanel() {
  const { mode, setMode, resolvedTheme } = useThemeMode();

  return (
    <div>
      <h3>Theme Settings</h3>
      <RadioGroup value={mode} onChange={setMode}>
        <Radio value="system" label="System preference" />
        <Radio value="light" label="Light mode" />
        <Radio value="dark" label="Dark mode" />
      </RadioGroup>
      <p>Currently using: {resolvedTheme} theme</p>
    </div>
  );
}
```

## Behavior

- Sets `data-theme` attribute on `<html>`
  - `data-theme="light"` for light mode
  - `data-theme="dark"` for dark mode
  - No attribute for system mode (CSS handles via `prefers-color-scheme`)
- Persists mode to localStorage
- Detects system preference via `prefers-color-scheme`

## CSS Integration

```css
/* Default (system mode relies on this) */
@media (prefers-color-scheme: dark) {
  :root {
    --bg: #1a1a1a;
    --text: #ffffff;
  }
}

/* Explicit theme overrides */
:root[data-theme='light'] {
  --bg: #ffffff;
  --text: #1a1a1a;
}

:root[data-theme='dark'] {
  --bg: #1a1a1a;
  --text: #ffffff;
}
```

## Do's and Don'ts

### Do

- Provide all three options (system, light, dark)
- Use `resolvedTheme` for asset selection
- Test with both system preferences

### Don't

- Forget to style for system preference
- Use `isDark` for CSS (use CSS variables)
- Ignore accessibility contrast requirements

## Related Hooks

- [useMediaQuery](./useMediaQuery.md) - Detect system preference directly
- [useLocalStorage](./useLocalStorage.md) - Base storage hook

## References

- [Source Code](../../src/hooks/useThemeMode.ts)
- [Tests](../../src/hooks/__tests__/useThemeMode.test.ts)
