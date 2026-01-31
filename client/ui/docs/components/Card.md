# Card

## Overview

A container component for grouping related content with consistent styling and elevation, commonly used for lists, grids, and content blocks.

## Import

```tsx
import { Card } from 'abeahn-ui/components';
```

## Props

| Prop      | Type                             | Default | Description                          |
| --------- | -------------------------------- | ------- | ------------------------------------ |
| children  | `ReactNode` (required)           | -       | Card content                         |
| className | `string`                         | `''`    | Additional CSS classes to apply      |
| ...props  | `HTMLAttributes<HTMLDivElement>` | -       | All standard HTML `<div>` attributes |

## Usage

### Basic Example

```tsx
<Card>
  <p>This is a simple card.</p>
</Card>
```

### Card with Title and Content

```tsx
<Card>
  <h3>Card Title</h3>
  <p>Card content goes here with some description.</p>
</Card>
```

### Interactive Card

```tsx
<Card onClick={() => console.log('Card clicked')} style={{ cursor: 'pointer' }}>
  <h3>Clickable Card</h3>
  <p>Click anywhere on this card</p>
</Card>
```

### Card Grid

```tsx
<div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
  <Card>
    <h4>Card 1</h4>
    <p>Content for card 1</p>
  </Card>
  <Card>
    <h4>Card 2</h4>
    <p>Content for card 2</p>
  </Card>
  <Card>
    <h4>Card 3</h4>
    <p>Content for card 3</p>
  </Card>
</div>
```

### Card with Image

```tsx
<Card>
  <img
    src="https://example.com/image.jpg"
    alt="Description"
    style={{ width: '100%', borderRadius: '8px 8px 0 0' }}
  />
  <div style={{ padding: '16px' }}>
    <h3>Image Card</h3>
    <p>Card with an image header</p>
  </div>
</Card>
```

### Card with Actions

```tsx
<Card>
  <div style={{ padding: '16px' }}>
    <h3>User Profile</h3>
    <p>John Doe - Software Engineer</p>
  </div>
  <div
    style={{
      borderTop: '1px solid #eee',
      padding: '12px 16px',
      display: 'flex',
      gap: '8px',
    }}
  >
    <button>Edit</button>
    <button>Delete</button>
  </div>
</Card>
```

### Card List

```tsx
<div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
  {items.map((item) => (
    <Card key={item.id}>
      <div style={{ padding: '16px' }}>
        <h4>{item.title}</h4>
        <p>{item.description}</p>
      </div>
    </Card>
  ))}
</div>
```

### Custom Styled Card

```tsx
<Card
  className="custom-card"
  style={{
    padding: '24px',
    backgroundColor: '#f5f5f5',
    border: '2px solid #333',
  }}
>
  <h3>Custom Card</h3>
  <p>With custom styling</p>
</Card>
```

## Accessibility

- Renders a semantic `<div>` element
- No built-in ARIA roles (neutral container)
- For clickable cards, consider using `<article>` or `<section>` with button inside
- Ensure interactive cards are keyboard accessible
- Use proper heading hierarchy within cards
- Add `role="article"` for news/blog post cards

### Clickable Card Pattern

```tsx
{
  /* Wrap card content in a link or button for accessibility */
}
<Card style={{ padding: 0 }}>
  <a
    href="/details"
    style={{
      display: 'block',
      padding: '16px',
      textDecoration: 'none',
      color: 'inherit',
    }}
  >
    <h3>Accessible Clickable Card</h3>
    <p>Entire card is clickable via link</p>
  </a>
</Card>;
```

## Do's and Don'ts

### Do

- Use cards to group related information
- Maintain consistent spacing and padding
- Use appropriate heading levels
- Add hover states for interactive cards
- Keep card content focused and scannable
- Use cards in grids or lists for consistency

### Don't

- Don't nest cards too deeply
- Don't use cards for every piece of content (can feel heavy)
- Don't make cards clickable without visual indication
- Don't forget to make interactive cards keyboard accessible
- Don't override the base card styles excessively
- Don't use cards when simpler containers suffice

## Related Components

- [Box](./Box.md) - For simpler flex-based containers
- [Divider](../elements/Divider.md) - For separating card sections
- [Button](./Button.md) - For card actions

## References

- [Source](../../src/components/Card.tsx)
- [Material Design: Cards](https://m3.material.io/components/cards/overview)
