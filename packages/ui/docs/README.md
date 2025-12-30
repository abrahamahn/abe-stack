# @abeahn/ui Component Documentation

Complete documentation for all components in the @abeahn/ui package.

## Quick Navigation

- [Components](#components) - Core UI components
- [Primitives](#primitives) - Low-level primitive components
- [Layouts](#layouts) - Layout components
- [Getting Started](#getting-started)
- [Import Patterns](#import-patterns)

## Components

Core UI components built on top of primitives.

| Component                              | Description                             | Import                  |
| -------------------------------------- | --------------------------------------- | ----------------------- |
| [Badge](./components/Badge.md)         | Display status or category indicators   | `@abeahn/ui/components` |
| [Box](./components/Box.md)             | Generic container with flexible styling | `@abeahn/ui/components` |
| [Button](./components/Button.md)       | Interactive button element              | `@abeahn/ui/components` |
| [Card](./components/Card.md)           | Container for related content           | `@abeahn/ui/components` |
| [FocusTrap](./components/FocusTrap.md) | Trap focus within a container           | `@abeahn/ui/components` |
| [Input](./components/Input.md)         | Text input field                        | `@abeahn/ui/components` |
| [Layout](./components/Layout.md)       | Generic layout wrapper                  | `@abeahn/ui/components` |
| [Spinner](./components/Spinner.md)     | Loading indicator                       | `@abeahn/ui/components` |

## Primitives

Low-level primitive components from Radix UI and custom implementations.

| Component                                        | Description                  | Import                  |
| ------------------------------------------------ | ---------------------------- | ----------------------- |
| [Accordion](./primitives/Accordion.md)           | Collapsible content sections | `@abeahn/ui/primitives` |
| [Alert](./primitives/Alert.md)                   | Display important messages   | `@abeahn/ui/primitives` |
| [Avatar](./primitives/Avatar.md)                 | User profile image display   | `@abeahn/ui/primitives` |
| [BadgePrimitive](./primitives/Badge.md)          | Primitive badge component    | `@abeahn/ui/primitives` |
| [Checkbox](./primitives/Checkbox.md)             | Boolean input control        | `@abeahn/ui/primitives` |
| [Dialog](./primitives/Dialog.md)                 | Modal dialog window          | `@abeahn/ui/primitives` |
| [Divider](./primitives/Divider.md)               | Visual content separator     | `@abeahn/ui/primitives` |
| [Dropdown](./primitives/Dropdown.md)             | Dropdown menu                | `@abeahn/ui/primitives` |
| [Heading](./primitives/Heading.md)               | Semantic heading text        | `@abeahn/ui/primitives` |
| [Image](./primitives/Image.md)                   | Lazy-loaded image component  | `@abeahn/ui/primitives` |
| [InputPrimitive](./primitives/InputPrimitive.md) | Primitive input component    | `@abeahn/ui/primitives` |
| [MenuItem](./primitives/MenuItem.md)             | Menu item element            | `@abeahn/ui/primitives` |
| [Modal](./primitives/Modal.md)                   | Modal overlay with portal    | `@abeahn/ui/primitives` |
| [Overlay](./primitives/Overlay.md)               | Background overlay           | `@abeahn/ui/primitives` |
| [Pagination](./primitives/Pagination.md)         | Page navigation controls     | `@abeahn/ui/primitives` |
| [Popover](./primitives/Popover.md)               | Floating content container   | `@abeahn/ui/primitives` |
| [Progress](./primitives/Progress.md)             | Progress indicator           | `@abeahn/ui/primitives` |
| [Radio](./primitives/Radio.md)                   | Single radio button          | `@abeahn/ui/primitives` |
| [RadioGroup](./primitives/RadioGroup.md)         | Group of radio buttons       | `@abeahn/ui/primitives` |
| [ResizablePanel](./primitives/ResizablePanel.md) | Resizable panel container    | `@abeahn/ui/primitives` |
| [ScrollArea](./primitives/ScrollArea.md)         | Custom scrollable area       | `@abeahn/ui/primitives` |
| [Select](./primitives/Select.md)                 | Dropdown selection input     | `@abeahn/ui/primitives` |
| [Skeleton](./primitives/Skeleton.md)             | Loading placeholder          | `@abeahn/ui/primitives` |
| [Slider](./primitives/Slider.md)                 | Range input slider           | `@abeahn/ui/primitives` |
| [Switch](./primitives/Switch.md)                 | Toggle switch control        | `@abeahn/ui/primitives` |
| [Table](./primitives/Table.md)                   | Data table component         | `@abeahn/ui/primitives` |
| [Tabs](./primitives/Tabs.md)                     | Tabbed content interface     | `@abeahn/ui/primitives` |
| [Text](./primitives/Text.md)                     | Semantic text element        | `@abeahn/ui/primitives` |
| [TextArea](./primitives/TextArea.md)             | Multi-line text input        | `@abeahn/ui/primitives` |
| [Toast](./primitives/Toast.md)                   | Notification message         | `@abeahn/ui/primitives` |
| [Tooltip](./primitives/Tooltip.md)               | Hover information display    | `@abeahn/ui/primitives` |
| [VisuallyHidden](./primitives/VisuallyHidden.md) | Screen-reader only content   | `@abeahn/ui/primitives` |

## Layouts

Layout components for page structure and composition.

| Component                                   | Description                | Import               |
| ------------------------------------------- | -------------------------- | -------------------- |
| [AppShell](./layouts/AppShell.md)           | Application shell layout   | `@abeahn/ui/layouts` |
| [AuthLayout](./layouts/AuthLayout.md)       | Authentication page layout | `@abeahn/ui/layouts` |
| [Container](./layouts/Container.md)         | Content width container    | `@abeahn/ui/layouts` |
| [PageContainer](./layouts/PageContainer.md) | Page wrapper container     | `@abeahn/ui/layouts` |
| [SidebarLayout](./layouts/SidebarLayout.md) | Layout with sidebar        | `@abeahn/ui/layouts` |
| [StackedLayout](./layouts/StackedLayout.md) | Vertically stacked layout  | `@abeahn/ui/layouts` |

## Getting Started

### Installation

```bash
pnpm add @abeahn/ui @abeahn/shared
```

### Basic Usage

```tsx
import { Button, Card } from '@abeahn/ui/components';
import { Input } from '@abeahn/ui/primitives';

export function MyComponent() {
  return (
    <Card>
      <Input placeholder="Enter text..." />
      <Button variant="primary">Submit</Button>
    </Card>
  );
}
```

## Import Patterns

The @abeahn/ui package supports both full and granular imports for tree-shaking optimization.

### Full Import (All Components)

```tsx
import { Button, Card, Input } from '@abeahn/ui';
```

**Bundle Size:** ~120KB (all components)

### Granular Imports (Recommended)

```tsx
// Import only components
import { Button, Card } from '@abeahn/ui/components';

// Import only primitives
import { Input, Select } from '@abeahn/ui/primitives';

// Import only layouts
import { AppShell, Container } from '@abeahn/ui/layouts';

// Import only hooks
import { useMediaQuery } from '@abeahn/ui/hooks';

// Import only theme
import { colors, spacing } from '@abeahn/ui/theme';

// Import only utils
import { cn } from '@abeahn/ui/utils';
```

**Bundle Size Impact:**

| Import Style                              | Estimated Bundle Size   |
| ----------------------------------------- | ----------------------- |
| Full (`@abeahn/ui`)                       | ~120KB (all components) |
| Components only (`@abeahn/ui/components`) | ~40KB                   |
| Primitives only (`@abeahn/ui/primitives`) | ~80KB                   |
| Layouts only (`@abeahn/ui/layouts`)       | ~30KB                   |
| Hooks only (`@abeahn/ui/hooks`)           | ~8KB                    |
| Theme only (`@abeahn/ui/theme`)           | ~4KB                    |
| Utils only (`@abeahn/ui/utils`)           | ~2KB                    |

## Contributing

See the main [package README](../README.md) for contribution guidelines.

## License

MIT - See [LICENSE](../../../LICENSE) for details.
