# @abeahn/ui Component Documentation

Complete documentation for all components in the @abeahn/ui package.

## Quick Navigation

- [Components](#components) - Core UI components
- [Elements](#elements) - Low-level element components
- [Layouts](#layouts) - Layout components
- [Hooks](#hooks) - React hooks
- [Getting Started](#getting-started)
- [Import Patterns](#import-patterns)

## Components

Core UI components built on top of elements.

Styles: Components load shared styling from `packages/ui/src/styles/components.css`.

| Component                                        | Description                             | Import                  |
| ------------------------------------------------ | --------------------------------------- | ----------------------- |
| [Badge](./components/Badge.md)                   | Display status or category indicators   | `@abeahn/ui/components` |
| [Box](./components/Box.md)                       | Generic container with flexible styling | `@abeahn/ui/components` |
| [Button](./components/Button.md)                 | Interactive button element              | `@abeahn/ui/components` |
| [Card](./components/Card.md)                     | Container for related content           | `@abeahn/ui/components` |
| [FocusTrap](./components/FocusTrap.md)           | Trap focus within a container           | `@abeahn/ui/components` |
| [Input](./components/Input.md)                   | Text input field                        | `@abeahn/ui/components` |
| [Layout](./components/Layout.md)                 | Generic layout wrapper                  | `@abeahn/ui/components` |
| [ProtectedRoute](./components/ProtectedRoute.md) | Auth-protected route wrapper            | `@abeahn/ui/components` |
| [Spinner](./components/Spinner.md)               | Loading indicator                       | `@abeahn/ui/components` |
| [Toaster](./components/Toaster.md)               | Toast notification container            | `@abeahn/ui/components` |

## elements

Low-level element components from Radix UI and custom implementations.

| Component                                      | Description                  | Import                |
| ---------------------------------------------- | ---------------------------- | --------------------- |
| [Accordion](./elements/Accordion.md)           | Collapsible content sections | `@abeahn/ui/elements` |
| [Alert](./elements/Alert.md)                   | Display important messages   | `@abeahn/ui/elements` |
| [Avatar](./elements/Avatar.md)                 | User profile image display   | `@abeahn/ui/elements` |
| [BadgeElement](./elements/Badge.md)            | Element badge component      | `@abeahn/ui/elements` |
| [Checkbox](./elements/Checkbox.md)             | Boolean input control        | `@abeahn/ui/elements` |
| [Dialog](./elements/Dialog.md)                 | Modal dialog window          | `@abeahn/ui/elements` |
| [Divider](./elements/Divider.md)               | Visual content separator     | `@abeahn/ui/elements` |
| [Dropdown](./elements/Dropdown.md)             | Dropdown menu                | `@abeahn/ui/elements` |
| [Heading](./elements/Heading.md)               | Semantic heading text        | `@abeahn/ui/elements` |
| [Image](./elements/Image.md)                   | Lazy-loaded image component  | `@abeahn/ui/elements` |
| [InputElement](./elements/InputElement.md)     | Element input component      | `@abeahn/ui/elements` |
| [MenuItem](./elements/MenuItem.md)             | Menu item element            | `@abeahn/ui/elements` |
| [Modal](./elements/Modal.md)                   | Modal overlay with portal    | `@abeahn/ui/elements` |
| [Overlay](./elements/Overlay.md)               | Background overlay           | `@abeahn/ui/elements` |
| [Pagination](./elements/Pagination.md)         | Page navigation controls     | `@abeahn/ui/elements` |
| [Popover](./elements/Popover.md)               | Floating content container   | `@abeahn/ui/elements` |
| [Progress](./elements/Progress.md)             | Progress indicator           | `@abeahn/ui/elements` |
| [Radio](./elements/Radio.md)                   | Single radio button          | `@abeahn/ui/elements` |
| [RadioGroup](./elements/RadioGroup.md)         | Group of radio buttons       | `@abeahn/ui/elements` |
| [ResizablePanel](./elements/ResizablePanel.md) | Resizable panel container    | `@abeahn/ui/elements` |
| [ScrollArea](./elements/ScrollArea.md)         | Custom scrollable area       | `@abeahn/ui/elements` |
| [Select](./elements/Select.md)                 | Dropdown selection input     | `@abeahn/ui/elements` |
| [Skeleton](./elements/Skeleton.md)             | Loading placeholder          | `@abeahn/ui/elements` |
| [Slider](./elements/Slider.md)                 | Range input slider           | `@abeahn/ui/elements` |
| [Switch](./elements/Switch.md)                 | Toggle switch control        | `@abeahn/ui/elements` |
| [Table](./elements/Table.md)                   | Data table component         | `@abeahn/ui/elements` |
| [Tabs](./elements/Tabs.md)                     | Tabbed content interface     | `@abeahn/ui/elements` |
| [Text](./elements/Text.md)                     | Semantic text element        | `@abeahn/ui/elements` |
| [TextArea](./elements/TextArea.md)             | Multi-line text input        | `@abeahn/ui/elements` |
| [Toast](./elements/Toast.md)                   | Notification message         | `@abeahn/ui/elements` |
| [Tooltip](./elements/Tooltip.md)               | Hover information display    | `@abeahn/ui/elements` |
| [VisuallyHidden](./elements/VisuallyHidden.md) | Screen-reader only content   | `@abeahn/ui/elements` |

## Layouts

Layout components for page structure and composition.

Styles: Layouts load shared styling from `packages/ui/src/styles/layouts.css`.

| Component                                   | Description                | Import               |
| ------------------------------------------- | -------------------------- | -------------------- |
| [AppShell](./layouts/AppShell.md)           | Application shell layout   | `@abeahn/ui/layouts` |
| [AuthLayout](./layouts/AuthLayout.md)       | Authentication page layout | `@abeahn/ui/layouts` |
| [Container](./layouts/Container.md)         | Content width container    | `@abeahn/ui/layouts` |
| [PageContainer](./layouts/PageContainer.md) | Page wrapper container     | `@abeahn/ui/layouts` |
| [SidebarLayout](./layouts/SidebarLayout.md) | Layout with sidebar        | `@abeahn/ui/layouts` |
| [StackedLayout](./layouts/StackedLayout.md) | Vertically stacked layout  | `@abeahn/ui/layouts` |

## Hooks

React hooks for common UI patterns and state management.

| Hook                                      | Description                                  | Import             |
| ----------------------------------------- | -------------------------------------------- | ------------------ |
| [useHistoryNav](./hooks/useHistoryNav.md) | Browser history navigation with React Router | `@abeahn/ui/hooks` |
| useClickOutside                           | Detect clicks outside an element             | `@abeahn/ui/hooks` |
| useControllableState                      | Controlled/uncontrolled state pattern        | `@abeahn/ui/hooks` |
| useCopyToClipboard                        | Copy text to clipboard                       | `@abeahn/ui/hooks` |
| useDebounce                               | Debounce value changes                       | `@abeahn/ui/hooks` |
| useDisclosure                             | Open/close state management                  | `@abeahn/ui/hooks` |
| useKeyboardShortcuts                      | Global keyboard shortcut handling            | `@abeahn/ui/hooks` |
| useLocalStorage                           | Persist state to localStorage                | `@abeahn/ui/hooks` |
| useMediaQuery                             | Responsive media query detection             | `@abeahn/ui/hooks` |
| useOnScreen                               | Intersection observer hook                   | `@abeahn/ui/hooks` |
| usePanelConfig                            | Panel layout configuration                   | `@abeahn/ui/hooks` |
| useThemeMode                              | Theme mode (light/dark/system)               | `@abeahn/ui/hooks` |
| useWindowSize                             | Window dimensions tracking                   | `@abeahn/ui/hooks` |

## Getting Started

### Installation

```bash
pnpm add @abeahn/ui @abeahn/shared
```

### Basic Usage

```tsx
import { Button, Card } from '@abeahn/ui/components';
import { Input } from '@abeahn/ui/elements';

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

// Import only elements
import { Input, Select } from '@abeahn/ui/elements';

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
| elements only (`@abeahn/ui/elements`)     | ~80KB                   |
| Layouts only (`@abeahn/ui/layouts`)       | ~30KB                   |
| Hooks only (`@abeahn/ui/hooks`)           | ~8KB                    |
| Theme only (`@abeahn/ui/theme`)           | ~4KB                    |
| Utils only (`@abeahn/ui/utils`)           | ~2KB                    |

## Contributing

See the main [package README](../README.md) for contribution guidelines.

## License

MIT - See [LICENSE](../../../LICENSE) for details.
