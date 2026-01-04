# usePanelConfig

## Overview

Manages resizable panel configurations with localStorage persistence. Handles visibility toggles and size changes for multi-panel layouts.

## Import

```tsx
import { usePanelConfig } from '@abe-stack/ui';
```

## Signature

```tsx
function usePanelConfig<T extends string>(
  storageKey: string,
  defaultConfig: PanelConfig<T>,
): UsePanelConfigReturn<T>;
```

## Types

```tsx
type PanelState = {
  visible: boolean;
  size: number;
};

type PanelConfig<T extends string> = Record<T, PanelState>;

type UsePanelConfigReturn<T extends string> = {
  config: PanelConfig<T>;
  togglePane: (pane: T) => void;
  resizePane: (pane: T, size: number) => void;
  resetConfig: () => void;
  setConfig: (config: PanelConfig<T>) => void;
};
```

## Parameters

| Parameter     | Type             | Description                      |
| ------------- | ---------------- | -------------------------------- |
| storageKey    | `string`         | localStorage key for persistence |
| defaultConfig | `PanelConfig<T>` | Default panel configuration      |

## Returns

| Property    | Type                               | Description                 |
| ----------- | ---------------------------------- | --------------------------- |
| config      | `PanelConfig<T>`                   | Current panel configuration |
| togglePane  | `(pane: T) => void`                | Toggle panel visibility     |
| resizePane  | `(pane: T, size: number) => void`  | Update panel size           |
| resetConfig | `() => void`                       | Reset to default config     |
| setConfig   | `(config: PanelConfig<T>) => void` | Set entire configuration    |

## Usage

### Basic Three-Panel Layout

```tsx
type Panels = 'left' | 'main' | 'right';

function Workspace() {
  const { config, togglePane, resizePane } = usePanelConfig<Panels>('workspace-panels', {
    left: { visible: true, size: 20 },
    main: { visible: true, size: 55 },
    right: { visible: true, size: 25 },
  });

  return (
    <ResizablePanelGroup direction="horizontal">
      {config.left.visible && (
        <ResizablePanel
          defaultSize={config.left.size}
          onResize={(size) => resizePane('left', size)}
        >
          <Sidebar />
        </ResizablePanel>
      )}
      <ResizablePanel defaultSize={config.main.size}>
        <MainContent />
      </ResizablePanel>
      {config.right.visible && (
        <ResizablePanel
          defaultSize={config.right.size}
          onResize={(size) => resizePane('right', size)}
        >
          <Inspector />
        </ResizablePanel>
      )}
    </ResizablePanelGroup>
  );
}
```

### Toggle Buttons

```tsx
function PanelToggles() {
  const { config, togglePane } = usePanelConfig('panels', defaultConfig);

  return (
    <div>
      <button onClick={() => togglePane('left')}>
        {config.left.visible ? 'Hide' : 'Show'} Sidebar
      </button>
      <button onClick={() => togglePane('right')}>
        {config.right.visible ? 'Hide' : 'Show'} Inspector
      </button>
    </div>
  );
}
```

### With Keyboard Shortcuts

```tsx
function App() {
  const { togglePane, resetConfig } = usePanelConfig('layout', defaultConfig);

  useKeyboardShortcuts([
    { key: 'L', handler: () => togglePane('left') },
    { key: 'R', handler: () => togglePane('right') },
    { key: 'Escape', handler: resetConfig },
  ]);

  return <Layout />;
}
```

## Behavior

- Persists to localStorage automatically
- Preserves size when toggling visibility
- Type-safe panel keys via generics

## Do's and Don'ts

### Do

- Use typed panel keys for safety
- Provide sensible default sizes
- Combine with keyboard shortcuts

### Don't

- Use for non-resizable layouts
- Forget to handle hidden panels in layout
- Store absolute pixel sizes (use percentages)

## Related Hooks

- [useLocalStorage](./useLocalStorage.md) - Base storage hook
- [useKeyboardShortcuts](./useKeyboardShortcuts.md) - Keyboard shortcuts

## Related Components

- [ResizablePanel](../compounds/ResizablePanel.md) - Resizable panel component

## References

- [Source Code](../../src/hooks/usePanelConfig.ts)
- [Tests](../../src/hooks/__tests__/usePanelConfig.test.ts)
