# Badge (Component)

## Overview

A badge component for displaying status labels, counts, or tags with different visual tones and optional interactivity.

**Note:** This is different from the [element Badge](../elements/Badge.md) which is polymorphic and supports ref forwarding. Use this component version for simpler cases with interaction support.

## Import

```tsx
import { Badge } from 'abeahn-ui/components';
```

## Props

| Prop      | Type                                              | Default | Description                                      |
| --------- | ------------------------------------------------- | ------- | ------------------------------------------------ |
| children  | `ReactNode` (required)                            | -       | Badge content (text, numbers, icons)             |
| tone      | `'success' \| 'danger' \| 'warning' \| 'neutral'` | -       | Visual style variant indicating semantic meaning |
| className | `string`                                          | -       | Additional CSS classes to apply                  |
| style     | `CSSProperties`                                   | -       | Inline styles                                    |
| onClick   | `MouseEventHandler`                               | -       | Click handler for interactive badges             |
| onKeyDown | `KeyboardEventHandler`                            | -       | Keyboard event handler                           |
| tabIndex  | `0 \| -1`                                         | -       | Tab index for keyboard navigation                |

## Usage

### Basic Example

```tsx
<Badge>New</Badge>
```

### Different Tones

```tsx
<Badge tone="success">Active</Badge>
<Badge tone="danger">Error</Badge>
<Badge tone="warning">Pending</Badge>
<Badge tone="neutral">Inactive</Badge>
```

### Count Badge

```tsx
<Badge tone="danger">5</Badge>
```

### Clickable Badge

```tsx
<Badge
  tone="neutral"
  onClick={() => console.log('Badge clicked')}
  onKeyDown={(e) => e.key === 'Enter' && console.log('Badge activated')}
  tabIndex={0}
>
  Clickable
</Badge>
```

### Notification Badge

```tsx
<div style={{ position: 'relative', display: 'inline-block' }}>
  <button>Messages</button>
  <Badge
    tone="danger"
    style={{
      position: 'absolute',
      top: '-8px',
      right: '-8px',
      minWidth: '20px',
    }}
  >
    3
  </Badge>
</div>
```

### Filter Tags

```tsx
const [selectedTags, setSelectedTags] = useState<string[]>([]);

const toggleTag = (tag: string) => {
  setSelectedTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
};

<div style={{ display: 'flex', gap: '8px' }}>
  {['React', 'TypeScript', 'CSS'].map((tag) => (
    <Badge
      key={tag}
      tone={selectedTags.includes(tag) ? 'success' : 'neutral'}
      onClick={() => toggleTag(tag)}
      onKeyDown={(e) => e.key === 'Enter' && toggleTag(tag)}
      tabIndex={0}
      style={{ cursor: 'pointer' }}
    >
      {tag}
    </Badge>
  ))}
</div>;
```

### Status Indicator

```tsx
const getStatusTone = (status: string) => {
  switch (status) {
    case 'online':
      return 'success';
    case 'offline':
      return 'neutral';
    case 'busy':
      return 'danger';
    case 'away':
      return 'warning';
    default:
      return 'neutral';
  }
};

<Badge tone={getStatusTone(userStatus)}>{userStatus}</Badge>;
```

## Accessibility

- Renders as a `<div>` (not semantic button/link)
- For interactive badges, add `tabIndex={0}` and keyboard handlers
- Screen readers may not announce as interactive without proper ARIA
- Consider adding `role="button"` and `aria-pressed` for toggle behavior
- Add `aria-label` for icon-only or number-only badges

### Interactive Badge Pattern

```tsx
<Badge
  tone="neutral"
  onClick={handleClick}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  }}
  tabIndex={0}
  role="button"
  aria-label="Remove tag"
>
  Tag ×
</Badge>
```

### Count Badge with Context

```tsx
<Badge tone="danger" aria-label="3 unread notifications">
  3
</Badge>
```

## Do's and Don'ts

### Do

- Use appropriate `tone` to convey semantic meaning
- Keep badge text concise (1-3 words or a number)
- Add keyboard support for interactive badges (onClick)
- Use `aria-label` for badges with only numbers or icons
- Consider using [element Badge](../elements/Badge.md) for more advanced use cases

### Don't

- Don't use badges for long text labels
- Don't make badges the primary call-to-action
- Don't forget keyboard handlers when using onClick
- Don't override tone colors to mean something different
- Don't use nested interactive elements

## Differences from Element Badge

| Feature                 | Component Badge                               | Element Badge                              |
| ----------------------- | --------------------------------------------- | ------------------------------------------ |
| Polymorphic (`as` prop) | ❌ No                                         | ✅ Yes                                     |
| Ref forwarding          | ❌ No                                         | ✅ Yes                                     |
| Tone options            | 4 options (success, danger, warning, neutral) | 4 options (info, success, danger, warning) |
| Interactive support     | ✅ Yes (onClick, onKeyDown)                   | Manual (via `as` prop)                     |
| Use case                | Simple badges with interactions               | Advanced/polymorphic usage                 |

## Related Components

- [Badge (Element)](../elements/Badge.md) - Polymorphic badge with ref forwarding
- [Text](../elements/Text.md) - For regular text content
- [Button](./Button.md) - For primary actions

## References

- [Source](../../src/components/Badge.tsx)
