# Accordion

## Overview

An accessible accordion component that allows users to show/hide sections of content, with only one section open at a time (single-expansion pattern).

## Import

```tsx
import { Accordion } from 'abeahn-ui/elements';
```

## Props

| Prop         | Type                           | Default | Description                                   |
| ------------ | ------------------------------ | ------- | --------------------------------------------- |
| items        | `AccordionItem[]` (required)   | -       | Array of accordion items                      |
| value        | `string \| null`               | -       | Controlled currently open item ID             |
| defaultValue | `string \| null`               | `null`  | Initially open item ID for uncontrolled usage |
| onChange     | `(id: string \| null) => void` | -       | Callback when opened item changes             |

### AccordionItem Type

```tsx
type AccordionItem = {
  id: string; // Unique identifier
  title: ReactNode; // Accordion header content
  content: ReactNode; // Accordion panel content
};
```

## Usage

### Basic Example

```tsx
const items = [
  {
    id: 'item1',
    title: 'What is React?',
    content: 'React is a JavaScript library for building user interfaces.',
  },
  {
    id: 'item2',
    title: 'What is TypeScript?',
    content: 'TypeScript is a typed superset of JavaScript.',
  },
  {
    id: 'item3',
    title: 'What is accessibility?',
    content: 'Accessibility ensures your app is usable by everyone.',
  },
];

<Accordion items={items} />;
```

### Controlled

```tsx
const [openId, setOpenId] = useState<string | null>('item1');

<Accordion items={items} value={openId} onChange={setOpenId} />;
```

### With Default Open Item

```tsx
<Accordion items={items} defaultValue="item2" />
```

### FAQ Example

```tsx
const faqItems = [
  {
    id: 'shipping',
    title: 'How long does shipping take?',
    content: (
      <div>
        <p>Standard shipping: 5-7 business days</p>
        <p>Express shipping: 2-3 business days</p>
      </div>
    ),
  },
  {
    id: 'returns',
    title: 'What is your return policy?',
    content: 'We accept returns within 30 days of purchase.',
  },
  {
    id: 'warranty',
    title: 'Do you offer a warranty?',
    content: 'All products come with a 1-year manufacturer warranty.',
  },
];

<Accordion items={faqItems} />;
```

### Rich Content

```tsx
const items = [
  {
    id: 'profile',
    title: (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <IconUser />
        <span>Profile Settings</span>
      </div>
    ),
    content: (
      <div>
        <label>Name:</label>
        <input type="text" />
        <label>Email:</label>
        <input type="email" />
      </div>
    ),
  },
  {
    id: 'security',
    title: (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <IconLock />
        <span>Security Settings</span>
      </div>
    ),
    content: (
      <div>
        <button>Change Password</button>
        <button>Enable 2FA</button>
      </div>
    ),
  },
];

<Accordion items={items} />;
```

### Tracking Expansions

```tsx
const [openId, setOpenId] = useState<string | null>(null);

<div>
  <Accordion
    items={items}
    value={openId}
    onChange={(id) => {
      setOpenId(id);
      console.log('Opened section:', id);
    }}
  />
  {openId && <div>Currently viewing: {openId}</div>}
</div>;
```

## Behavior

- Only one item can be open at a time (single-expansion)
- Clicking an open item closes it
- Toggle indicator shows `+` when closed, `−` when open
- Content is unmounted when closed (conditional rendering)
- Each item has unique IDs for ARIA relationships

## Accessibility

- Uses semantic HTML (`<h3>`, `<button>`)
- Implements proper ARIA accordion pattern
- Header buttons have `aria-expanded` and `aria-controls`
- Content panels have `role="region"` and `aria-labelledby`
- Keyboard accessible (Tab to navigate, Enter/Space to toggle)
- Toggle indicator is `aria-hidden` (decorative only)
- Screen readers announce expanded/collapsed state

## Do's and Don'ts

### Do

- Use for related sections of content
- Keep titles concise and descriptive
- Provide meaningful item IDs
- Use for FAQ sections
- Use for settings panels
- Consider default open state for important content

### Don't

- Don't nest accordions deeply
- Don't use for navigation (use menu/nav instead)
- Don't hide critical information in accordions
- Don't use when all content should be visible
- Don't forget to provide unique IDs for all items
- Don't make accordions too long (>10 items)

## Multiple Expansion Pattern

This component only allows one item open at a time. For multiple simultaneous items, you'll need to:

- Manage an array of open IDs
- Modify the component or create a custom implementation

## Related Components

- [Tabs](./Tabs.md) - For switching between mutually exclusive views
- [Collapsible/Disclosure](./Disclosure.md) - For single expandable sections

## References

- [Source](../../src/elements/Accordion.tsx)
- [Tests](../../src/elements/__tests__/Accordion.test.tsx)
- [Hooks: useControllableState](../../src/hooks/useControllableState.ts)
- [ARIA: Accordion Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/accordion/)
