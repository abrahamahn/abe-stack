# AppShell

## Overview

A complete application shell layout with header, footer, sidebar, and aside slots. Uses CSS Grid and CSS custom properties for responsive, collapsible layout.

## Import

```tsx
import { AppShell } from 'abeahn-ui/layouts';
```

## Props

| Prop             | Type                   | Default   | Description               |
| ---------------- | ---------------------- | --------- | ------------------------- |
| header           | `ReactNode`            | -         | Header content            |
| sidebar          | `ReactNode`            | -         | Left sidebar content      |
| aside            | `ReactNode`            | -         | Right aside panel content |
| footer           | `ReactNode`            | -         | Footer content            |
| children         | `ReactNode` (required) | -         | Main content              |
| headerHeight     | `string \| number`     | `'64px'`  | Header height             |
| footerHeight     | `string \| number`     | `'auto'`  | Footer height             |
| sidebarWidth     | `string \| number`     | `'250px'` | Sidebar width             |
| asideWidth       | `string \| number`     | `'250px'` | Aside panel width         |
| sidebarCollapsed | `boolean`              | `false`   | Hide sidebar              |
| asideCollapsed   | `boolean`              | `false`   | Hide aside panel          |
| className        | `string`               | -         | Additional CSS classes    |
| style            | `CSSProperties`        | -         | Additional inline styles  |

## Usage

### Basic Example

```tsx
<AppShell header={<Header />} sidebar={<Sidebar />}>
  <MainContent />
</AppShell>
```

### Complete App Layout

```tsx
<AppShell
  header={
    <div style={{ display: 'flex', alignItems: 'center', padding: '0 20px' }}>
      <h1>My App</h1>
      <nav style={{ marginLeft: 'auto' }}>
        <UserMenu />
      </nav>
    </div>
  }
  sidebar={
    <nav>
      <Link to="/">Home</Link>
      <Link to="/dashboard">Dashboard</Link>
      <Link to="/settings">Settings</Link>
    </nav>
  }
  aside={
    <div>
      <h3>Notifications</h3>
      <NotificationList />
    </div>
  }
  footer={<div style={{ padding: '16px', textAlign: 'center' }}>&copy; 2024 Company</div>}
  headerHeight="64px"
  sidebarWidth="280px"
  asideWidth="300px"
>
  <div style={{ padding: '24px' }}>
    <h2>Main Content</h2>
    <p>Your content here</p>
  </div>
</AppShell>
```

### Collapsible Sidebar

```tsx
const [sidebarOpen, setSidebarOpen] = useState(true);

<AppShell
  header={
    <div>
      <button onClick={() => setSidebarOpen(!sidebarOpen)}>Toggle Sidebar</button>
    </div>
  }
  sidebar={<Sidebar />}
  sidebarCollapsed={!sidebarOpen}
>
  <Main />
</AppShell>;
```

### With Responsive Behavior

```tsx
const isMobile = useMediaQuery('(max-width: 768px)');

<AppShell
  header={<Header />}
  sidebar={<Sidebar />}
  sidebarCollapsed={isMobile}
  sidebarWidth={isMobile ? '100%' : '250px'}
>
  <Main />
</AppShell>;
```

### Dashboard Layout

```tsx
<AppShell
  header={<DashboardHeader />}
  sidebar={<DashboardNav />}
  aside={<ActivityPanel />}
  headerHeight="72px"
  sidebarWidth="260px"
  asideWidth="320px"
>
  <DashboardContent />
</AppShell>
```

## CSS Custom Properties

AppShell uses CSS variables for dynamic sizing:

```css
--ui-header-height: 64px (or provided value) --ui-footer-height: auto (or provided value)
  --ui-sidebar-width: 250px (or 0px if collapsed) --ui-aside-width: 250px (or 0px if collapsed);
```

You can reference these in your styles:

```tsx
<div style={{ height: 'calc(100vh - var(--ui-header-height))' }}>Content</div>
```

## Grid Structure

CSS Grid areas:

```
┌─────────────────────────────┐
│         header              │
├─────────┬───────────┬───────┤
│ sidebar │   main    │ aside │
│         │           │       │
└─────────┴───────────┴───────┘
│         footer              │
└─────────────────────────────┘
```

## Accessibility

- Uses semantic HTML elements
- Header uses `<header>` element
- Sidebars use `<aside>` elements
- Main content uses `<main>` element
- Footer uses `<footer>` element
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
- Test responsive behavior

### Don't

- Don't use for simple pages (use PageContainer)
- Don't make sidebars too wide (>350px)
- Don't forget mobile layout
- Don't nest AppShell components
- Don't put navigation in aside (use sidebar)

## Related Components

- [Layout](../components/Layout.md) - Alternative grid layout
- [SidebarLayout](./SidebarLayout.md) - Simpler sidebar-only layout
- [PageContainer](./PageContainer.md) - Simple page container

## References

- [Source](../../src/layouts/AppShell.tsx)
- [Tests](../../src/layouts/__tests__/AppShell.test.tsx)
