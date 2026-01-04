# useKeyboardShortcuts

## Overview

Handles global keyboard shortcuts with modifier key support. Automatically skips shortcuts when user is typing in input fields.

## Import

```tsx
import { useKeyboardShortcuts } from '@abe-stack/ui';
```

## Signature

```tsx
function useKeyboardShortcuts(
  shortcuts: KeyboardShortcut[],
  options?: UseKeyboardShortcutsOptions,
): void;
```

## Parameters

### KeyboardShortcut

| Property       | Type         | Default | Description                          |
| -------------- | ------------ | ------- | ------------------------------------ |
| key            | `string`     | -       | Key to listen for (case-insensitive) |
| handler        | `() => void` | -       | Function to call when triggered      |
| description    | `string`     | -       | Optional description for display     |
| preventDefault | `boolean`    | `true`  | Whether to prevent default           |
| ctrlKey        | `boolean`    | `false` | Requires Ctrl/Cmd key                |
| shiftKey       | `boolean`    | `false` | Requires Shift key                   |
| altKey         | `boolean`    | `false` | Requires Alt key                     |

### Options

| Property   | Type      | Default | Description                   |
| ---------- | --------- | ------- | ----------------------------- |
| skipInputs | `boolean` | `true`  | Skip when typing in inputs    |
| enabled    | `boolean` | `true`  | Whether shortcuts are enabled |

## Usage

### Basic Shortcuts

```tsx
function App() {
  useKeyboardShortcuts([
    { key: 'Escape', handler: () => closeModal() },
    { key: 'L', handler: () => toggleLeftPanel() },
    { key: 'R', handler: () => toggleRightPanel() },
  ]);

  return <div>...</div>;
}
```

### With Modifier Keys

```tsx
useKeyboardShortcuts([
  { key: 'K', handler: openSearch, ctrlKey: true },
  { key: 'S', handler: save, ctrlKey: true },
  { key: 'Z', handler: undo, ctrlKey: true },
  { key: 'Z', handler: redo, ctrlKey: true, shiftKey: true },
]);
```

### Conditional Shortcuts

```tsx
function Editor({ isEditing }) {
  useKeyboardShortcuts(
    [
      { key: 'S', handler: save, ctrlKey: true },
      { key: 'Escape', handler: cancelEdit },
    ],
    { enabled: isEditing },
  );

  return <div>...</div>;
}
```

### Display Shortcuts to Users

```tsx
const shortcuts = [
  { key: 'K', handler: openSearch, ctrlKey: true, description: 'Search' },
  { key: 'L', handler: toggleSidebar, description: 'Toggle sidebar' },
];

useKeyboardShortcuts(shortcuts);

// Render help
<ul>
  {shortcuts.map((s) => (
    <li key={s.key}>
      <Kbd>
        {s.ctrlKey ? 'Ctrl+' : ''}
        {s.key}
      </Kbd>{' '}
      {s.description}
    </li>
  ))}
</ul>;
```

## Behavior

- Matches first shortcut that matches key and modifiers
- Skips input/textarea/contentEditable by default
- Uses `metaKey` (Cmd) as alias for `ctrlKey` on Mac

## Do's and Don'ts

### Do

- Use standard shortcuts users expect (Ctrl+S, Escape)
- Provide visual hints for available shortcuts
- Test on both Mac and Windows

### Don't

- Override critical browser shortcuts (Ctrl+W, Ctrl+T)
- Create conflicting shortcuts
- Forget to disable when shortcuts shouldn't work

## Related Components

- [Kbd](../elements/Kbd.md) - Display keyboard keys

## References

- [Source Code](../../src/hooks/useKeyboardShortcuts.ts)
