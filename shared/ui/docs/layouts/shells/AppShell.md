# AppShell

## Overview

A responsive application shell layout with header, footer, sidebar, and aside slots. Uses CSS Grid for non-resizable mode and ResizablePanel for resizable mode. AppShell is a pure container - users compose by passing ReactNode children (including TopbarLayout, LeftSidebarLayout, etc.).

## Import

```tsx
import { AppShell } from '@abe-stack/ui';
```

## Props

### Slot Props

| Prop     | Type        | Default | Description                                    |
| -------- | ----------- | ------- | ---------------------------------------------- |
| children | `ReactNode` | -       | Main content (required)                        |
| header   | `ReactNode` | -       | Header content (e.g., TopbarLayout)            |
| sidebar  | `ReactNode` | -       | Left sidebar content (e.g., LeftSidebarLayout) |
| aside    | `ReactNode` | -       | Right aside panel (e.g., RightSidebarLayout)   |
| footer   | `ReactNode` | -       | Footer content (e.g., BottombarLayout)         |

### Size Props

| Prop         | Type               | Default   | Description       |
| ------------ | ------------------ | --------- | ----------------- |
| headerHeight | `string \| number` | `'4rem'`  | Header height     |
| footerHeight | `string \| number` | `'3rem'`  | Footer height     |
| sidebarWidth | `string \| number` | `'15rem'` | Sidebar width     |
| asideWidth   | `string \| number` | `'15rem'` | Aside panel width |

### Collapse Props

| Prop             | Type      | Default | Description      |
| ---------------- | --------- | ------- | ---------------- |
| headerCollapsed  | `boolean` | `false` | Hide header      |
| sidebarCollapsed | `boolean` | `false` | Hide sidebar     |
| asideCollapsed   | `boolean` | `false` | Hide aside panel |
| footerCollapsed  | `boolean` | `false` | Hide footer      |

### Resize Props

| Prop             | Type      | Default | Description             |
| ---------------- | --------- | ------- | ----------------------- |
| headerResizable  | `boolean` | `false` | Enable header resizing  |
| sidebarResizable | `boolean` | `false` | Enable sidebar resizing |
| asideResizable   | `boolean` | `false` | Enable aside resizing   |
| footerResizable  | `boolean` | `false` | Enable footer resizing  |

### Resize Constraints (percentage)

| Prop           | Type     | Default | Description          |
| -------------- | -------- | ------- | -------------------- |
| headerMinSize  | `number` | `4`     | Min header size (%)  |
| headerMaxSize  | `number` | `30`    | Max header size (%)  |
| sidebarMinSize | `number` | `10`    | Min sidebar size (%) |
| sidebarMaxSize | `number` | `40`    | Max sidebar size (%) |
| asideMinSize   | `number` | `10`    | Min aside size (%)   |
| asideMaxSize   | `number` | `40`    | Max aside size (%)   |
| footerMinSize  | `number` | `3`     | Min footer size (%)  |
| footerMaxSize  | `number` | `20`    | Max footer size (%)  |

### Resize Callbacks

| Prop            | Type                     | Description                    |
| --------------- | ------------------------ | ------------------------------ |
| onHeaderResize  | `(size: number) => void` | Called when header is resized  |
| onSidebarResize | `(size: number) => void` | Called when sidebar is resized |
| onAsideResize   | `(size: number) => void` | Called when aside is resized   |
| onFooterResize  | `(size: number) => void` | Called when footer is resized  |

### Other Props

| Prop      | Type            | Description              |
| --------- | --------------- | ------------------------ |
| className | `string`        | Additional CSS classes   |
| style     | `CSSProperties` | Additional inline styles |

## Usage

### Basic Example

```tsx
<AppShell header={<Header />} sidebar={<Sidebar />}>
  <MainContent />
</AppShell>
```

### Complete App Layout with Shell Components

```tsx
<AppShell
  header={<TopbarLayout left={<Logo />} center={<SearchBar />} right={<UserMenu />} bordered />}
  sidebar={
    <LeftSidebarLayout
      header={<CategoryIcons />}
      content={<Navigation />}
      footer={<SettingsButton />}
    />
  }
  aside={
    <RightSidebarLayout header={<PanelHeader title="Details" />} content={<DetailContent />} />
  }
  footer={
    <BottombarLayout
      left={<VersionBadge version="1.0.0" />}
      center={<Text tone="muted">Press ? for shortcuts</Text>}
      right={<ThemeToggle />}
    />
  }
  headerHeight="4rem"
  sidebarWidth="3.125rem"
  asideWidth="20rem"
>
  <MainContent />
</AppShell>
```

### Collapsible Sidebar

```tsx
const [sidebarOpen, setSidebarOpen] = useState(true);

<AppShell
  header={
    <TopbarLayout left={<Button onClick={() => setSidebarOpen(!sidebarOpen)}>Toggle</Button>} />
  }
  sidebar={<LeftSidebarLayout content={<Menu />} />}
  sidebarCollapsed={!sidebarOpen}
>
  <Main />
</AppShell>;
```

### With Resizable Panels

```tsx
<AppShell
  header={<TopbarLayout left={<Logo />} />}
  sidebar={<LeftSidebarLayout content={<Menu />} />}
  aside={<RightSidebarLayout content={<Details />} />}
  sidebarResizable
  asideResizable
  sidebarMinSize={15}
  sidebarMaxSize={35}
  onSidebarResize={(size) => console.log('Sidebar:', size)}
  onAsideResize={(size) => console.log('Aside:', size)}
>
  <MainContent />
</AppShell>
```

### Responsive Behavior

```tsx
const isMobile = useMediaQuery('(max-width: 768px)');

<AppShell
  header={<TopbarLayout left={<Logo />} right={<MenuButton />} />}
  sidebar={<LeftSidebarLayout content={<Nav />} />}
  sidebarCollapsed={isMobile}
>
  <Main />
</AppShell>;
```

## CSS Custom Properties

AppShell uses CSS variables for dynamic sizing:

```css
--app-shell-header-height: 4rem; /* or provided value */
--app-shell-footer-height: 3rem; /* or provided value */
--app-shell-sidebar-width: 15rem; /* or 0px if collapsed */
--app-shell-aside-width: 15rem; /* or 0px if collapsed */
```

You can reference these in your styles:

```tsx
<div style={{ height: 'calc(100vh - var(--app-shell-header-height))' }}>Content</div>
```

## Grid Structure

Non-resizable mode uses CSS Grid areas:

```
+-----------------------------+
|         header              |
+---------+-----------+-------+
| sidebar |   main    | aside |
|         |           |       |
+---------+-----------+-------+
|         footer              |
+-----------------------------+
```

## Rendering Modes

**Non-resizable mode (default)**: Uses CSS Grid with semantic HTML elements (`<header>`, `<aside>`, `<main>`, `<footer>`).

**Resizable mode**: Uses `ResizablePanelGroup` with drag handles for resizing. Enabled when any `*Resizable` prop is true.

## Accessibility

- Uses semantic HTML elements
- Header renders as `<header>` element
- Sidebars render as `<aside>` elements
- Main content renders as `<main>` element
- Footer renders as `<footer>` element
- Consider adding ARIA labels to panels

### Example with ARIA

```tsx
<AppShell
  header={<header role="banner">Header</header>}
  sidebar={<aside aria-label="Main navigation">Nav</aside>}
  aside={<aside aria-label="Activity feed">Feed</aside>}
>
  <main role="main">Content</main>
</AppShell>
```

## Do's and Don'ts

### Do

- Use for full application layouts
- Collapse sidebars on mobile
- Persist collapse state
- Use semantic content in slots
- Compose with other shell components (TopbarLayout, LeftSidebarLayout, etc.)

### Don't

- Use for simple pages (use PageContainer)
- Make sidebars too wide (>350px)
- Forget mobile layout
- Nest AppShell components
- Put navigation in aside (use sidebar)

## Related Components

- [TopbarLayout](./TopbarLayout.md) - Top navigation bar
- [BottombarLayout](./BottombarLayout.md) - Bottom status bar
- [LeftSidebarLayout](./LeftSidebarLayout.md) - Left sidebar component
- [RightSidebarLayout](./RightSidebarLayout.md) - Right panel component
- [PageContainer](./PageContainer.md) - Simple page container

## References

- [Source Code](../../src/layouts/shells/AppShell.tsx)
- [Tests](../../src/layouts/shells/__tests__/AppShell.test.tsx)
