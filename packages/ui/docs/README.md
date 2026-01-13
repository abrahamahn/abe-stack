# @abe-stack/ui Component Documentation

Complete documentation for all components in the @abe-stack/ui package.

## Quick Navigation

- [Components](#components) - Stateful multi-part components
- [Elements](#elements) - Low-level primitive elements
- [Layouts](#layouts) - Page structure and layout components
- [Hooks](#hooks) - React hooks
- [Theme](#theme) - Theme configuration
- [Getting Started](#getting-started)
- [Import Patterns](#import-patterns)
- [CSS Architecture](#css-architecture)

## Components

Stateful components with complex behavior, compound patterns, or multi-part APIs.

| Component                                            | Description                   | Import          |
| ---------------------------------------------------- | ----------------------------- | --------------- |
| [Accordion](./components/Accordion.md)               | Collapsible content sections  | `@abe-stack/ui` |
| [Card](./components/Card.md)                         | Container for related content | `@abe-stack/ui` |
| [Dialog](./components/Dialog.md)                     | Modal dialog window           | `@abe-stack/ui` |
| [Dropdown](./components/Dropdown.md)                 | Dropdown menu                 | `@abe-stack/ui` |
| [FocusTrap](./components/FocusTrap.md)               | Trap focus within container   | `@abe-stack/ui` |
| [FormField](./components/FormField.md)               | Form field with label/error   | `@abe-stack/ui` |
| [Image](./components/Image.md)                       | Lazy-loaded image component   | `@abe-stack/ui` |
| [LoadingContainer](./components/LoadingContainer.md) | Centered loading display      | `@abe-stack/ui` |
| [Pagination](./components/Pagination.md)             | Page navigation controls      | `@abe-stack/ui` |
| [Popover](./components/Popover.md)                   | Floating content container    | `@abe-stack/ui` |
| [Radio](./components/Radio.md)                       | Single radio button           | `@abe-stack/ui` |
| [RadioGroup](./components/RadioGroup.md)             | Group of radio buttons        | `@abe-stack/ui` |
| [Select](./components/Select.md)                     | Dropdown selection input      | `@abe-stack/ui` |
| [Slider](./components/Slider.md)                     | Range input slider            | `@abe-stack/ui` |
| [Tabs](./components/Tabs.md)                         | Tabbed content interface      | `@abe-stack/ui` |
| [Toast](./components/Toast.md)                       | Notification message          | `@abe-stack/ui` |

## Elements

Low-level primitive elements with minimal logic.

| Element                                              | Description                  | Import          |
| ---------------------------------------------------- | ---------------------------- | --------------- |
| [Alert](./elements/Alert.md)                         | Display important messages   | `@abe-stack/ui` |
| [Avatar](./elements/Avatar.md)                       | User profile image display   | `@abe-stack/ui` |
| [Badge](./elements/Badge.md)                         | Status or category indicator | `@abe-stack/ui` |
| [Box](./elements/Box.md)                             | Generic container element    | `@abe-stack/ui` |
| [Button](./elements/Button.md)                       | Interactive button element   | `@abe-stack/ui` |
| [Checkbox](./elements/Checkbox.md)                   | Boolean input control        | `@abe-stack/ui` |
| [CloseButton](./elements/CloseButton.md)             | Close/dismiss button         | `@abe-stack/ui` |
| [Divider](./elements/Divider.md)                     | Visual content separator     | `@abe-stack/ui` |
| [EnvironmentBadge](./components/EnvironmentBadge.md) | Environment status display   | `@abe-stack/ui` |
| [Heading](./elements/Heading.md)                     | Semantic heading text        | `@abe-stack/ui` |
| [Input](./elements/Input.md)                         | Text input field             | `@abe-stack/ui` |
| [Kbd](./elements/Kbd.md)                             | Keyboard key display         | `@abe-stack/ui` |
| [MenuItem](./elements/MenuItem.md)                   | Menu item element            | `@abe-stack/ui` |
| [Progress](./elements/Progress.md)                   | Progress indicator           | `@abe-stack/ui` |
| [Skeleton](./elements/Skeleton.md)                   | Loading placeholder          | `@abe-stack/ui` |
| [Spinner](./elements/Spinner.md)                     | Loading indicator            | `@abe-stack/ui` |
| [Switch](./elements/Switch.md)                       | Toggle switch control        | `@abe-stack/ui` |
| [Table](./elements/Table.md)                         | Data table component         | `@abe-stack/ui` |
| [Text](./elements/Text.md)                           | Semantic text element        | `@abe-stack/ui` |
| [TextArea](./elements/TextArea.md)                   | Multi-line text input        | `@abe-stack/ui` |
| [Toaster](./elements/Toaster.md)                     | Toast notification container | `@abe-stack/ui` |
| [Tooltip](./elements/Tooltip.md)                     | Hover information display    | `@abe-stack/ui` |
| [VersionBadge](./components/VersionBadge.md)         | Version display badge        | `@abe-stack/ui` |
| [VisuallyHidden](./elements/VisuallyHidden.md)       | Screen-reader only content   | `@abe-stack/ui` |

## Layouts

Page structure and layout components organized by purpose.

### Shells

App-level structural layouts with built-in resizing support.

| Layout                                                       | Description               | Import          |
| ------------------------------------------------------------ | ------------------------- | --------------- |
| [AppShell](./layouts/shells/AppShell.md)                     | Application shell layout  | `@abe-stack/ui` |
| [BottombarLayout](./layouts/shells/BottombarLayout.md)       | Fixed bottom navigation   | `@abe-stack/ui` |
| [LeftSidebarLayout](./layouts/shells/LeftSidebarLayout.md)   | Left sidebar layout       | `@abe-stack/ui` |
| [ResizablePanel](./layouts/shells/ResizablePanel.md)         | Resizable panel container | `@abe-stack/ui` |
| [RightSidebarLayout](./layouts/shells/RightSidebarLayout.md) | Right sidebar layout      | `@abe-stack/ui` |
| [TopbarLayout](./layouts/shells/TopbarLayout.md)             | Fixed top navigation      | `@abe-stack/ui` |

### Containers

Content wrapper and spacing layouts.

| Layout                                                 | Description                | Import          |
| ------------------------------------------------------ | -------------------------- | --------------- |
| [AuthLayout](./layouts/containers/AuthLayout.md)       | Authentication page layout | `@abe-stack/ui` |
| [Container](./layouts/containers/Container.md)         | Content width container    | `@abe-stack/ui` |
| [PageContainer](./layouts/containers/PageContainer.md) | Page wrapper container     | `@abe-stack/ui` |
| [StackedLayout](./layouts/containers/StackedLayout.md) | Vertically stacked layout  | `@abe-stack/ui` |

### Layers

Overlay and positioning components.

| Layout                                               | Description                  | Import          |
| ---------------------------------------------------- | ---------------------------- | --------------- |
| [Modal](./layouts/layers/Modal.md)                   | Modal overlay with portal    | `@abe-stack/ui` |
| [Overlay](./layouts/layers/Overlay.md)               | Background overlay           | `@abe-stack/ui` |
| [ProtectedRoute](./layouts/layers/ProtectedRoute.md) | Auth-protected route wrapper | `@abe-stack/ui` |
| [ScrollArea](./layouts/layers/ScrollArea.md)         | Custom scrollable area       | `@abe-stack/ui` |

## Hooks

React hooks for common UI patterns and state management.

| Hook                                                    | Description                      |
| ------------------------------------------------------- | -------------------------------- |
| [useClickOutside](./hooks/useClickOutside.md)           | Detect clicks outside an element |
| [useControllableState](./hooks/useControllableState.md) | Controlled/uncontrolled state    |
| [useCopyToClipboard](./hooks/useCopyToClipboard.md)     | Copy text to clipboard           |
| [useDebounce](./hooks/useDebounce.md)                   | Debounce value changes           |
| [useDisclosure](./hooks/useDisclosure.md)               | Open/close state management      |
| [useHistoryNav](./hooks/useHistoryNav.md)               | Browser history navigation       |
| [useKeyboardShortcuts](./hooks/useKeyboardShortcuts.md) | Global keyboard shortcuts        |
| [useLocalStorage](./hooks/useLocalStorage.md)           | Persist state to localStorage    |
| [useMediaQuery](./hooks/useMediaQuery.md)               | Media query detection            |
| [useOnScreen](./hooks/useOnScreen.md)                   | Intersection observer hook       |
| [usePanelConfig](./hooks/usePanelConfig.md)             | Panel layout configuration       |
| [useThemeMode](./hooks/useThemeMode.md)                 | Theme mode (light/dark/system)   |
| [useWindowSize](./hooks/useWindowSize.md)               | Window dimensions tracking       |

## Theme

Theme configuration and providers.

| Export                                    | Description            |
| ----------------------------------------- | ---------------------- |
| [ThemeProvider](./theme/ThemeProvider.md) | Theme context provider |

## Getting Started

### Installation

```bash
pnpm add @abe-stack/ui @abe-stack/core
```

### Basic Usage

```tsx
import { Button, Card, Input } from '@abe-stack/ui';

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

All exports are available from the main package entry:

```tsx
// Import everything from main entry
import { Button, Card, Input, Modal, useDisclosure } from '@abe-stack/ui';
```

## Component Categories

| Category   | Purpose                               | Examples                      |
| ---------- | ------------------------------------- | ----------------------------- |
| Components | Stateful multi-part components        | Accordion, Dialog, Tabs       |
| Elements   | Low-level primitives, building blocks | Badge, Text, Checkbox, Button |
| Layouts    | Page structure and composition        | AppShell, Modal, Container    |

## CSS Architecture

The UI package uses a modular CSS architecture with design tokens, component styles, and utility classes.

### CSS File Structure

```
packages/ui/src/styles/
├── theme.css       # Design tokens (CSS custom properties)
├── elements.css    # Element/primitive component styles
├── components.css  # Higher-level component styles
├── layouts.css     # Page layout component styles
└── utilities.css   # Tailwind-inspired utility classes
```

### Import Hierarchy

```
theme.css          ← Design tokens (base)
    ↓
elements.css       ← Imports theme.css
    ↓
components.css     ← Imports elements.css
    ↓
layouts.css        ← Imports theme.css
    ↓
utilities.css      ← Imports theme.css
```

### Design Tokens (theme.css)

All design values are defined as CSS custom properties with `--ui-` prefix:

| Token Category    | Examples                                                       | Usage                  |
| ----------------- | -------------------------------------------------------------- | ---------------------- |
| **Spacing**       | `--ui-gap-xs` to `--ui-gap-3xl`                                | Gaps, padding, margins |
| **Border Radius** | `--ui-radius-sm`, `--ui-radius-md`, `--ui-radius-lg`           | Border roundness       |
| **Colors**        | `--ui-color-primary`, `--ui-color-bg`, `--ui-color-text`       | All colors             |
| **Typography**    | `--ui-font-size-*`, `--ui-font-weight-*`, `--ui-line-height-*` | Text styles            |
| **Motion**        | `--ui-motion-duration-*`, `--ui-motion-ease-*`                 | Animations             |

#### Dark Mode

Theme automatically adapts via `prefers-color-scheme: dark` media query. All color tokens have dark mode variants.

### Component Styles

UI components import their own CSS and use semantic class names:

```tsx
// packages/ui/src/elements/Alert.tsx
import '../styles/elements.css';

export const Alert = ({ variant, children }) => (
  <div className={`alert alert-${variant}`}>{children}</div>
);
```

### Usage Guidelines

#### UI Components (Internal)

UI package components use semantic class names from elements.css/components.css:

```tsx
// Good - component uses its own semantic class
<div className="alert alert-info">...</div>
<button className="btn btn-primary">...</button>
```

#### Application Components (External)

Apps compose layouts using utility classes:

```tsx
// Good - app uses utilities for layout composition
<div className="flex-col gap-4 p-4">
  <header className="bar border-b">...</header>
  <main className="flex-1 overflow-auto">...</main>
</div>
```

## Contributing

See the main [package README](../README.md) for contribution guidelines.

## License

MIT - See [LICENSE](../../../LICENSE) for details.
