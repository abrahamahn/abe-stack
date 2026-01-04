# @abe-stack/ui Component Documentation

Complete documentation for all components in the @abe-stack/ui package.

## Quick Navigation

- [Components](#components) - Application-level UI components
- [Compounds](#compounds) - Multi-part compound components
- [Elements](#elements) - Low-level primitive elements
- [Layouts](#layouts) - Layout components
- [Hooks](#hooks) - React hooks
- [Getting Started](#getting-started)
- [Import Patterns](#import-patterns)
- [CSS Architecture](#css-architecture) - Styling system and utilities

## Components

Application-level UI components built for common use cases.

| Component                                            | Description                             | Import          |
| ---------------------------------------------------- | --------------------------------------- | --------------- |
| [Box](./components/Box.md)                           | Generic container with flexible styling | `@abe-stack/ui` |
| [Button](./components/Button.md)                     | Interactive button element              | `@abe-stack/ui` |
| [Card](./components/Card.md)                         | Container for related content           | `@abe-stack/ui` |
| [EnvironmentBadge](./components/EnvironmentBadge.md) | Environment status display              | `@abe-stack/ui` |
| [Input](./components/Input.md)                       | Text input field with label             | `@abe-stack/ui` |
| [Layout](./components/Layout.md)                     | Generic layout wrapper                  | `@abe-stack/ui` |
| [LoadingContainer](./components/LoadingContainer.md) | Centered loading display                | `@abe-stack/ui` |
| [ProtectedRoute](./components/ProtectedRoute.md)     | Auth-protected route wrapper            | `@abe-stack/ui` |
| [Spinner](./components/Spinner.md)                   | Loading indicator                       | `@abe-stack/ui` |
| [Toaster](./components/Toaster.md)                   | Toast notification container            | `@abe-stack/ui` |
| [VersionBadge](./components/VersionBadge.md)         | Version display badge                   | `@abe-stack/ui` |

## Compounds

Multi-part compound components with complex state and behavior.

| Component                                       | Description                  | Import          |
| ----------------------------------------------- | ---------------------------- | --------------- |
| [Accordion](./compounds/Accordion.md)           | Collapsible content sections | `@abe-stack/ui` |
| [Dialog](./compounds/Dialog.md)                 | Modal dialog window          | `@abe-stack/ui` |
| [Dropdown](./compounds/Dropdown.md)             | Dropdown menu                | `@abe-stack/ui` |
| [FocusTrap](./compounds/FocusTrap.md)           | Trap focus within container  | `@abe-stack/ui` |
| [FormField](./compounds/FormField.md)           | Form field with label/error  | `@abe-stack/ui` |
| [Modal](./compounds/Modal.md)                   | Modal overlay with portal    | `@abe-stack/ui` |
| [Pagination](./compounds/Pagination.md)         | Page navigation controls     | `@abe-stack/ui` |
| [Popover](./compounds/Popover.md)               | Floating content container   | `@abe-stack/ui` |
| [RadioGroup](./compounds/RadioGroup.md)         | Group of radio buttons       | `@abe-stack/ui` |
| [ResizablePanel](./compounds/ResizablePanel.md) | Resizable panel container    | `@abe-stack/ui` |
| [ScrollArea](./compounds/ScrollArea.md)         | Custom scrollable area       | `@abe-stack/ui` |
| [Select](./compounds/Select.md)                 | Dropdown selection input     | `@abe-stack/ui` |
| [Tabs](./compounds/Tabs.md)                     | Tabbed content interface     | `@abe-stack/ui` |
| [Toast](./compounds/Toast.md)                   | Notification message         | `@abe-stack/ui` |

## Elements

Low-level primitive elements with minimal logic.

| Component                                      | Description                  | Import          |
| ---------------------------------------------- | ---------------------------- | --------------- |
| [Alert](./elements/Alert.md)                   | Display important messages   | `@abe-stack/ui` |
| [Avatar](./elements/Avatar.md)                 | User profile image display   | `@abe-stack/ui` |
| [Badge](./elements/Badge.md)                   | Status or category indicator | `@abe-stack/ui` |
| [CardElement](./elements/CardElement.md)       | Card structure primitives    | `@abe-stack/ui` |
| [Checkbox](./elements/Checkbox.md)             | Boolean input control        | `@abe-stack/ui` |
| [Divider](./elements/Divider.md)               | Visual content separator     | `@abe-stack/ui` |
| [Heading](./elements/Heading.md)               | Semantic heading text        | `@abe-stack/ui` |
| [Image](./elements/Image.md)                   | Lazy-loaded image component  | `@abe-stack/ui` |
| [InputElement](./elements/InputPrimitive.md)   | Base input element           | `@abe-stack/ui` |
| [Kbd](./elements/Kbd.md)                       | Keyboard key display         | `@abe-stack/ui` |
| [MenuItem](./elements/MenuItem.md)             | Menu item element            | `@abe-stack/ui` |
| [Overlay](./elements/Overlay.md)               | Background overlay           | `@abe-stack/ui` |
| [Progress](./elements/Progress.md)             | Progress indicator           | `@abe-stack/ui` |
| [Radio](./elements/Radio.md)                   | Single radio button          | `@abe-stack/ui` |
| [Skeleton](./elements/Skeleton.md)             | Loading placeholder          | `@abe-stack/ui` |
| [Slider](./elements/Slider.md)                 | Range input slider           | `@abe-stack/ui` |
| [Switch](./elements/Switch.md)                 | Toggle switch control        | `@abe-stack/ui` |
| [Table](./elements/Table.md)                   | Data table component         | `@abe-stack/ui` |
| [Text](./elements/Text.md)                     | Semantic text element        | `@abe-stack/ui` |
| [TextArea](./elements/TextArea.md)             | Multi-line text input        | `@abe-stack/ui` |
| [Tooltip](./elements/Tooltip.md)               | Hover information display    | `@abe-stack/ui` |
| [VisuallyHidden](./elements/VisuallyHidden.md) | Screen-reader only content   | `@abe-stack/ui` |

## Layouts

Layout components for page structure and composition.

| Component                                       | Description                | Import          |
| ----------------------------------------------- | -------------------------- | --------------- |
| [AppShell](./layouts/AppShell.md)               | Application shell layout   | `@abe-stack/ui` |
| [AuthLayout](./layouts/AuthLayout.md)           | Authentication page layout | `@abe-stack/ui` |
| [BottombarLayout](./layouts/BottombarLayout.md) | Fixed bottom navigation    | `@abe-stack/ui` |
| [Container](./layouts/Container.md)             | Content width container    | `@abe-stack/ui` |
| [PageContainer](./layouts/PageContainer.md)     | Page wrapper container     | `@abe-stack/ui` |
| [SidebarLayout](./layouts/SidebarLayout.md)     | Layout with sidebar        | `@abe-stack/ui` |
| [StackedLayout](./layouts/StackedLayout.md)     | Vertically stacked layout  | `@abe-stack/ui` |
| [TopbarLayout](./layouts/TopbarLayout.md)       | Fixed top navigation       | `@abe-stack/ui` |

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

## Getting Started

### Installation

```bash
pnpm add @abe-stack/ui @abe-stack/shared
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

### Namespaced Imports

For organization, you can use namespaced imports:

```tsx
import { components, compounds, elements, layouts } from '@abe-stack/ui';

// Access via namespace
<components.Button />
<compounds.Modal.Root />
<elements.Badge />
<layouts.AppShell />
```

## Component Categories

| Category   | Purpose                                | Examples                      |
| ---------- | -------------------------------------- | ----------------------------- |
| Components | Application-level, ready-to-use        | Button, Card, Input, Spinner  |
| Compounds  | Multi-part with complex state/behavior | Modal, Dialog, Tabs, Select   |
| Elements   | Low-level primitives, building blocks  | Badge, Text, Checkbox, Slider |
| Layouts    | Page structure and composition         | AppShell, SidebarLayout       |

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

#### Spacing Scale

| Token          | Value   | Pixels (base 16px) |
| -------------- | ------- | ------------------ |
| `--ui-gap-xs`  | 0.25rem | 4px                |
| `--ui-gap-sm`  | 0.5rem  | 8px                |
| `--ui-gap-md`  | 0.75rem | 12px               |
| `--ui-gap-lg`  | 1rem    | 16px               |
| `--ui-gap-xl`  | 1.5rem  | 24px               |
| `--ui-gap-2xl` | 2rem    | 32px               |
| `--ui-gap-3xl` | 3rem    | 48px               |

#### Dark Mode

Theme automatically adapts via `prefers-color-scheme: dark` media query. All color tokens have dark mode variants.

### Component Styles (elements.css, components.css)

UI components import their own CSS and use semantic class names:

```tsx
// packages/ui/src/elements/Alert.tsx
import '../styles/elements.css';

export const Alert = ({ variant, children }) => (
  <div className={`alert alert-${variant}`}>{children}</div>
);
```

Class naming convention:

- Base class: `.alert`, `.button`, `.card`
- Variants: `.alert-info`, `.button-primary`, `.card-compact`
- States: `.button:hover`, `.input:focus`, `.checkbox:checked`

### Layout Styles (layouts.css)

Page-level layout components:

| Class               | Description                         |
| ------------------- | ----------------------------------- |
| `.app-shell`        | Main application grid layout        |
| `.topbar-layout`    | Layout with fixed top navigation    |
| `.bottombar-layout` | Layout with fixed bottom navigation |
| `.sidebar-layout`   | Two-column layout with sidebar      |
| `.auth-layout`      | Centered authentication forms       |
| `.container`        | Centered content container          |
| `.page-container`   | Page content wrapper                |

### Utility Classes (utilities.css)

Tailwind-inspired utility classes for application-level composition:

#### Flexbox

```css
.flex           /* display: flex */
.flex-col       /* flex-direction: column */
.flex-row       /* flex-direction: row */
.items-center   /* align-items: center */
.justify-between /* justify-content: space-between */
.flex-1         /* flex: 1 */
.flex-shrink-0  /* flex-shrink: 0 */
```

#### Spacing

```css
.gap-1 to .gap-8    /* gap using design tokens */
.p-1 to .p-12       /* padding */
.px-2 to .px-4      /* horizontal padding */
.py-2 to .py-4      /* vertical padding */
.m-0, .m-auto       /* margin */
.mt-1 to .mt-6      /* margin-top */
.mb-1 to .mb-6      /* margin-bottom */
```

#### Sizing

```css
.w-full, .w-screen, .w-auto
.h-full, .h-screen, .h-auto
.min-w-0, .min-h-0
```

#### Typography

```css
.text-xs to .text-xl    /* font sizes */
.font-normal, .font-medium, .font-semibold, .font-bold
.text-left, .text-center, .text-right
```

#### Borders & Backgrounds

```css
.border, .border-t, .border-b, .border-l, .border-r
.rounded, .rounded-md, .rounded-lg, .rounded-full
.bg-surface, .bg-primary, .bg-transparent
```

#### Layout Utilities

```css
.panel          /* Flex column container, full height */
.panel-header   /* Panel header with space-between */
.panel-content  /* Scrollable panel content */
.bar            /* Horizontal toolbar/footer */
.bar-section    /* Group items within a bar */
.sidebar        /* Sidebar with responsive width */
.menu-item      /* Interactive list item */
.empty-state    /* Centered empty state */
.grid-auto      /* Responsive auto-fit grid */
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

#### Responsive Design

Use CSS media queries, not JavaScript:

```css
/* Good - CSS handles responsive */
.sidebar {
  width: 3.125rem;
}
@media (max-width: 48rem) {
  .sidebar {
    width: 2.625rem;
  }
}
```

```tsx
// Avoid - JS-based responsive
const isMobile = useMediaQuery('(max-width: 768px)');
style={{ width: isMobile ? '42px' : '50px' }}
```

#### Units

Use `rem` for consistency (never `px`):

| Avoid                        | Prefer                       |
| ---------------------------- | ---------------------------- |
| `16px`                       | `1rem` or `var(--ui-gap-lg)` |
| `768px`                      | `48rem`                      |
| `style={{ padding: '8px' }}` | `className="p-2"`            |

### Adding New Styles

1. **Design tokens**: Add to `theme.css`
2. **Component styles**: Add to `elements.css` or `components.css`
3. **Layout styles**: Add to `layouts.css`
4. **Utility classes**: Add to `utilities.css`

Follow existing naming patterns and use design tokens for all values.

## Contributing

See the main [package README](../README.md) for contribution guidelines.

## License

MIT - See [LICENSE](../../../LICENSE) for details.
