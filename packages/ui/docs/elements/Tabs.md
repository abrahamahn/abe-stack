# Tabs

## Overview

An accessible tabs component for organizing content into separate panels, with keyboard navigation support and proper ARIA implementation.

## Import

```tsx
import { Tabs } from 'abeahn-ui/elements';
```

## Props

| Prop         | Type                   | Default         | Description                                    |
| ------------ | ---------------------- | --------------- | ---------------------------------------------- |
| items        | `TabItem[]` (required) | -               | Array of tab items                             |
| value        | `string`               | -               | Controlled active tab ID                       |
| defaultValue | `string`               | First item's ID | Initially active tab ID for uncontrolled usage |
| onChange     | `(id: string) => void` | -               | Callback when active tab changes               |

### TabItem Type

```tsx
type TabItem = {
  id: string; // Unique identifier
  label: string; // Tab button text
  content: ReactNode; // Tab panel content
};
```

## Usage

### Basic Example

```tsx
const tabs = [
  {
    id: 'profile',
    label: 'Profile',
    content: <div>Profile content</div>,
  },
  {
    id: 'settings',
    label: 'Settings',
    content: <div>Settings content</div>,
  },
  {
    id: 'notifications',
    label: 'Notifications',
    content: <div>Notifications content</div>,
  },
];

<Tabs items={tabs} />;
```

### Controlled

```tsx
const [activeTab, setActiveTab] = useState('profile');

<Tabs items={tabs} value={activeTab} onChange={setActiveTab} />;
```

### With Default Tab

```tsx
<Tabs items={tabs} defaultValue="settings" />
```

### Dashboard Example

```tsx
const dashboardTabs = [
  {
    id: 'overview',
    label: 'Overview',
    content: (
      <div>
        <h2>Dashboard Overview</h2>
        <p>Welcome back! Here's your summary...</p>
      </div>
    ),
  },
  {
    id: 'analytics',
    label: 'Analytics',
    content: <AnalyticsChart />,
  },
  {
    id: 'reports',
    label: 'Reports',
    content: <ReportsTable />,
  },
];

<Tabs items={dashboardTabs} />;
```

### With Counts/Badges

```tsx
const tabs = [
  {
    id: 'all',
    label: 'All (42)',
    content: <AllItems />,
  },
  {
    id: 'active',
    label: 'Active (12)',
    content: <ActiveItems />,
  },
  {
    id: 'archived',
    label: 'Archived (30)',
    content: <ArchivedItems />,
  },
];

<Tabs items={tabs} />;
```

### Tracking Tab Changes

```tsx
const [activeTab, setActiveTab] = useState('home');

<Tabs
  items={tabs}
  value={activeTab}
  onChange={(id) => {
    setActiveTab(id);
    console.log('Switched to tab:', id);
    // Track analytics, update URL, etc.
  }}
/>;
```

### With URL Synchronization

```tsx
const [searchParams, setSearchParams] = useSearchParams();
const activeTab = searchParams.get('tab') || 'profile';

<Tabs
  items={tabs}
  value={activeTab}
  onChange={(id) => {
    setSearchParams({ tab: id });
  }}
/>;
```

## Keyboard Navigation

Tabs implements full keyboard navigation:

| Key             | Action                               |
| --------------- | ------------------------------------ |
| **ArrowRight**  | Move to next tab (wraps to first)    |
| **ArrowLeft**   | Move to previous tab (wraps to last) |
| **Home**        | Jump to first tab                    |
| **End**         | Jump to last tab                     |
| **Tab**         | Move focus to active tab panel       |
| **Shift + Tab** | Move focus back to tab list          |

## Accessibility

- Implements ARIA tabs pattern
- Tab list has `role="tablist"`
- Tab buttons have `role="tab"`, `aria-selected`, `aria-controls`
- Tab panels have `role="tabpanel"`, `aria-labelledby`
- Only active tab is in tab order (`tabIndex={0}`)
- Inactive tabs have `tabIndex={-1}`
- Arrow key navigation between tabs
- Keyboard focus management
- Screen readers announce tab selection and panel relationship

## Do's and Don'ts

### Do

- Use for related content that users may want to compare
- Keep tab labels concise (1-2 words)
- Provide unique IDs for all tabs
- Use for settings panels, dashboards, profiles
- Show 3-7 tabs (optimal range)
- Persist active tab in URL for deep linking

### Don't

- Don't use tabs for sequential workflows (use stepper instead)
- Don't hide critical information in tabs
- Don't use too many tabs (>10)
- Don't use tabs for navigation between pages
- Don't make tab labels too long
- Don't nest tabs within tabs

## Performance Note

All tab panels are rendered but only the active one is visible. For lazy loading:

```tsx
const tabs = [
  {
    id: 'heavy',
    label: 'Heavy Content',
    content: activeTab === 'heavy' ? <HeavyComponent /> : null,
  },
  // ...
];
```

## Related Components

- [Accordion](./Accordion.md) - For collapsible sections
- [Button](../components/Button.md) - For action buttons

## References

- [Source](../../src/elements/Tabs.tsx)
- [Tests](../../src/elements/__tests__/Tabs.test.tsx)
- [ARIA: Tabs Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/)
