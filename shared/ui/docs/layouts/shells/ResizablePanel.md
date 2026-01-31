# ResizablePanel

## Overview

Resizable panel components for creating adjustable split layouts with draggable separators. Exports `ResizablePanelGroup`, `ResizablePanel`, and `ResizableSeparator`.

## Import

```tsx
import { ResizablePanelGroup, ResizablePanel, ResizableSeparator } from 'abeahn-ui/elements';
```

## Components

### ResizablePanelGroup

Container for resizable panels.

| Prop      | Type                         | Default        | Description               |
| --------- | ---------------------------- | -------------- | ------------------------- |
| children  | `ReactNode` (required)       | -              | ResizablePanel components |
| direction | `'horizontal' \| 'vertical'` | `'horizontal'` | Layout direction          |

### ResizablePanel

Individual resizable panel. Supports both controlled and uncontrolled modes.

| Prop         | Type                         | Default        | Description                                           |
| ------------ | ---------------------------- | -------------- | ----------------------------------------------------- |
| children     | `ReactNode` (required)       | -              | Panel content                                         |
| size         | `number`                     | -              | Controlled size (enables controlled mode when set)    |
| defaultSize  | `number`                     | `50`           | Default size for uncontrolled mode                    |
| minSize      | `number`                     | `10`           | Minimum size as percentage or pixels                  |
| maxSize      | `number`                     | `90`           | Maximum size as percentage or pixels                  |
| unit         | `'%' \| 'px'`                | `'%'`          | Unit for size values                                  |
| collapsed    | `boolean`                    | `false`        | Collapse panel to zero with animation                 |
| direction    | `'horizontal' \| 'vertical'` | `'horizontal'` | Resize direction                                      |
| invertResize | `boolean`                    | `false`        | Reverse resize delta direction                        |
| onResize     | `(size: number) => void`     | -              | Callback when size changes (required for persistence) |

### ResizableSeparator

Draggable separator between panels (auto-added by ResizablePanel).

| Prop        | Type                         | Default        | Description            |
| ----------- | ---------------------------- | -------------- | ---------------------- |
| direction   | `'horizontal' \| 'vertical'` | `'horizontal'` | Separator orientation  |
| onResize    | `(delta: number) => void`    | -              | Resize handler         |
| onDragStart | `() => void`                 | -              | Callback on drag start |
| onDragEnd   | `() => void`                 | -              | Callback on drag end   |

## Usage

### Basic Horizontal Layout

```tsx
<ResizablePanelGroup direction="horizontal">
  <ResizablePanel defaultSize={30} minSize={20}>
    Sidebar
  </ResizablePanel>
  <ResizablePanel defaultSize={70}>Main Content</ResizablePanel>
</ResizablePanelGroup>
```

### Vertical Layout

```tsx
<ResizablePanelGroup direction="vertical">
  <ResizablePanel defaultSize={40}>Top Panel</ResizablePanel>
  <ResizablePanel defaultSize={60}>Bottom Panel</ResizablePanel>
</ResizablePanelGroup>
```

### Three-Panel Layout

```tsx
<ResizablePanelGroup direction="horizontal">
  <ResizablePanel defaultSize={20} minSize={15}>
    Left Sidebar
  </ResizablePanel>
  <ResizablePanel defaultSize={60} minSize={40}>
    Main Content
  </ResizablePanel>
  <ResizablePanel defaultSize={20} minSize={15}>
    Right Sidebar
  </ResizablePanel>
</ResizablePanelGroup>
```

### With Resize Callback

```tsx
<ResizablePanel
  defaultSize={30}
  onResize={(size) => {
    console.log('New size:', size);
    localStorage.setItem('panelSize', String(size));
  }}
>
  Content
</ResizablePanel>
```

### IDE-style Layout

```tsx
<ResizablePanelGroup direction="vertical" style={{ height: '100vh' }}>
  <ResizablePanel defaultSize={30} minSize={20}>
    <ResizablePanelGroup direction="horizontal">
      <ResizablePanel defaultSize={25}>File Explorer</ResizablePanel>
      <ResizablePanel defaultSize={75}>Editor</ResizablePanel>
    </ResizablePanelGroup>
  </ResizablePanel>
  <ResizablePanel defaultSize={70} minSize={50}>
    Terminal
  </ResizablePanel>
</ResizablePanelGroup>
```

### Persist Size (Controlled Mode)

Use the `size` prop for controlled mode to ensure saved sizes persist across page reloads:

```tsx
import { useLocalStorage } from 'abeahn-ui/hooks';

const [panelConfig, setPanelConfig] = useLocalStorage('panel-config', {
  left: { size: 30 },
  right: { size: 25 },
});

<ResizablePanelGroup>
  <ResizablePanel
    size={panelConfig.left.size}
    onResize={(size) => setPanelConfig((prev) => ({ ...prev, left: { size } }))}
  >
    Sidebar
  </ResizablePanel>
  <ResizablePanel>Main</ResizablePanel>
  <ResizablePanel
    size={panelConfig.right.size}
    invertResize
    onResize={(size) => setPanelConfig((prev) => ({ ...prev, right: { size } }))}
  >
    Details
  </ResizablePanel>
</ResizablePanelGroup>;
```

> **Note:** Using `size` instead of `defaultSize` enables controlled mode. The `defaultSize` prop only sets the initial value on mount, whereas `size` updates the panel whenever the prop changes.

## Accessibility

- Separator has `role="separator"`
- Uses `aria-orientation` to indicate resize direction
- Keyboard resize not implemented (mouse-only currently)
- Consider adding keyboard controls for full accessibility

### Keyboard Support (Recommended Enhancement)

```tsx
{
  /* Add keyboard handlers to separator */
}
<ResizableSeparator
  onKeyDown={(e) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      // Handle keyboard resize
    }
  }}
/>;
```

## Do's and Don'ts

### Do

- Set reasonable `minSize` and `maxSize` constraints
- Persist panel sizes for better UX
- Test on different screen sizes
- Provide visual feedback during drag
- Use in complex application layouts

### Don't

- Don't make panels too small (<100px)
- Don't collapse panels without a recovery control (button or toggle)
- Don't forget mobile considerations (touch may not work well)
- Don't nest too many resizable layouts
- Don't use for simple two-column layouts (use CSS Grid)

## Related Components

- [Layout](../components/Layout.md) - Simpler grid-based layout
- [AppShell](../layouts/AppShell.md) - Application shell layout

## References

- [Source](../../src/elements/ResizablePanel.tsx)
- [Tests](../../src/elements/__tests__/ResizablePanel.test.tsx)
