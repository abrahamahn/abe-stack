# SidebarLayout

## Overview

A two-column layout with left sidebar and main content area, with optional header. Uses CSS Grid for consistent structure.

## Import

```tsx
import { SidebarLayout } from 'abeahn-ui/layouts';
```

## Props

| Prop      | Type                   | Default | Description                                 |
| --------- | ---------------------- | ------- | ------------------------------------------- |
| sidebar   | `ReactNode` (required) | -       | Sidebar content (left column)               |
| header    | `ReactNode`            | -       | Header content (appears above main content) |
| children  | `ReactNode` (required) | -       | Main content (right column)                 |
| className | `string`               | -       | Additional CSS classes                      |

## Usage

### Basic Example

```tsx
<SidebarLayout
  sidebar={
    <nav>
      <Link to="/">Home</Link>
      <Link to="/about">About</Link>
      <Link to="/contact">Contact</Link>
    </nav>
  }
>
  <h1>Page Title</h1>
  <p>Main content here</p>
</SidebarLayout>
```

### With Header

```tsx
<SidebarLayout
  sidebar={<Navigation />}
  header={
    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
      <h1>Dashboard</h1>
      <UserMenu />
    </div>
  }
>
  <DashboardContent />
</SidebarLayout>
```

### Documentation Layout

```tsx
<SidebarLayout
  sidebar={
    <nav>
      <h3>Documentation</h3>
      <ul>
        <li>
          <Link to="/docs/getting-started">Getting Started</Link>
        </li>
        <li>
          <Link to="/docs/components">Components</Link>
        </li>
        <li>
          <Link to="/docs/api">API Reference</Link>
        </li>
      </ul>
    </nav>
  }
  header={
    <div>
      <Breadcrumbs />
      <SearchBar />
    </div>
  }
>
  <article>
    <h1>Getting Started</h1>
    <p>Documentation content...</p>
  </article>
</SidebarLayout>
```

### Settings Page

```tsx
<SidebarLayout
  sidebar={
    <nav>
      <h3>Settings</h3>
      <Link to="/settings/profile">Profile</Link>
      <Link to="/settings/security">Security</Link>
      <Link to="/settings/notifications">Notifications</Link>
      <Link to="/settings/billing">Billing</Link>
    </nav>
  }
>
  <div>
    <h1>Profile Settings</h1>
    <form>
      <Input label="Name" />
      <Input label="Email" />
      <Button type="submit">Save Changes</Button>
    </form>
  </div>
</SidebarLayout>
```

### App Navigation

```tsx
<SidebarLayout
  sidebar={
    <div>
      <Logo />
      <nav style={{ marginTop: '32px' }}>
        <NavItem icon={<IconHome />} to="/">
          Home
        </NavItem>
        <NavItem icon={<IconChart />} to="/analytics">
          Analytics
        </NavItem>
        <NavItem icon={<IconUsers />} to="/users">
          Users
        </NavItem>
        <NavItem icon={<IconSettings />} to="/settings">
          Settings
        </NavItem>
      </nav>
    </div>
  }
  header={<TopBar />}
>
  <Outlet />
</SidebarLayout>
```

## Layout

- Grid structure: `280px (sidebar) | 1fr (main)`
- Sidebar width: `var(--ui-sidebar-width, 280px)` (customizable via CSS variable)
- Full height: `min-height: 100vh`
- Sidebar: bordered, with padding and background
- Header: bordered bottom, with padding
- Main content: padded with `var(--ui-gap-xl)`

## Customization

Override sidebar width via CSS variable:

```tsx
<SidebarLayout
  sidebar={<Nav />}
  className="custom-layout"
  style={{ '--ui-sidebar-width': '320px' } as React.CSSProperties}
>
  <Main />
</SidebarLayout>
```

## Accessibility

- Sidebar uses `<aside>` element
- Main content uses `<main>` element
- Header uses `<div>` (wrap in semantic element if needed)
- Consider adding `aria-label` to sidebar

### Example with ARIA

```tsx
<SidebarLayout
  sidebar={
    <aside aria-label="Main navigation">
      <nav>...</nav>
    </aside>
  }
>
  <main role="main">Content</main>
</SidebarLayout>
```

## Do's and Don'ts

### Do

- Use for documentation, settings, dashboards
- Keep sidebar navigation focused
- Use appropriate sidebar width (220-320px)
- Test responsive behavior
- Consider mobile collapse

### Don't

- Don't make sidebar too wide (>350px)
- Don't put complex forms in sidebar
- Don't forget mobile layout
- Don't use for simple pages
- Don't nest SidebarLayout

## Mobile Considerations

This component doesn't handle responsive behavior automatically. Consider:

```tsx
const isMobile = useMediaQuery('(max-width: 768px)');

{
  isMobile ? (
    <MobileSidebarLayout sidebar={<Nav />}>
      <Content />
    </MobileSidebarLayout>
  ) : (
    <SidebarLayout sidebar={<Nav />}>
      <Content />
    </SidebarLayout>
  );
}
```

## Related Components

- [AppShell](./AppShell.md) - More complete app layout
- [Layout](../components/Layout.md) - Flexible grid layout
- [Container](./Container.md) - Centered container

## References

- [Source](../../src/layouts/SidebarLayout.tsx)
