# Popover

## Overview

A popover component for displaying additional content when triggered, with keyboard support and flexible positioning.

## Import

```tsx
import { Popover } from 'abeahn-ui/primitives';
```

## Props

| Prop        | Type                      | Default    | Description                               |
| ----------- | ------------------------- | ---------- | ----------------------------------------- |
| trigger     | `ReactNode` (required)    | -          | Trigger element content                   |
| children    | `ReactNode` (required)    | -          | Popover content                           |
| placement   | `'bottom' \| 'right'`     | `'bottom'` | Popover position relative to trigger      |
| open        | `boolean`                 | -          | Controlled open state                     |
| defaultOpen | `boolean`                 | `false`    | Initial open state for uncontrolled usage |
| onChange    | `(open: boolean) => void` | -          | Callback when open state changes          |

## Usage

### Basic Example

```tsx
<Popover trigger={<button>Info</button>}>
  <div>Additional information here</div>
</Popover>
```

### Help Text

```tsx
<Popover trigger={<IconHelp />}>
  <div style={{ padding: '12px', maxWidth: '200px' }}>
    <h4>Password Requirements</h4>
    <ul>
      <li>At least 8 characters</li>
      <li>One uppercase letter</li>
      <li>One number</li>
    </ul>
  </div>
</Popover>
```

### Different Placements

```tsx
<Popover trigger={<button>Bottom</button>} placement="bottom">
  Content appears below
</Popover>

<Popover trigger={<button>Right</button>} placement="right">
  Content appears to the right
</Popover>
```

### Controlled

```tsx
const [open, setOpen] = useState(false);

<Popover trigger={<button>Toggle</button>} open={open} onChange={setOpen}>
  <div>Popover content</div>
</Popover>;
```

### Rich Content

```tsx
<Popover trigger={<Avatar src={user.avatar} />}>
  <div style={{ padding: '16px', width: '250px' }}>
    <h3>{user.name}</h3>
    <p>{user.email}</p>
    <p>Last seen: {user.lastSeen}</p>
    <button>View Profile</button>
  </div>
</Popover>
```

### With Form

```tsx
<Popover trigger={<button>Filters</button>}>
  <div style={{ padding: '16px' }}>
    <h4>Filter Options</h4>
    <Checkbox label="Active" />
    <Checkbox label="Archived" />
    <button>Apply</button>
  </div>
</Popover>
```

## Keyboard Navigation

| Key               | Action                                    |
| ----------------- | ----------------------------------------- |
| **Enter / Space** | Toggle popover                            |
| **Escape**        | Close popover and return focus to trigger |

## Accessibility

- Trigger has `role="button"` and `tabIndex={0}` for keyboard access
- `aria-expanded` indicates open/closed state
- ESC key closes popover and restores focus
- Focus management handled automatically

## Do's and Don'ts

### Do

- Use for supplementary content
- Keep content concise
- Provide a way to close (ESC, click outside, close button)
- Use appropriate placement for context
- Consider mobile/touch interactions

### Don't

- Don't use for critical information (use Dialog/Modal)
- Don't nest popovers
- Don't put complex forms in popovers
- Don't forget keyboard accessibility
- Don't make trigger too small (<44px touch target)

## Popover vs Tooltip vs Dropdown

| Component    | Use Case                     |
| ------------ | ---------------------------- |
| **Popover**  | Rich content, forms, details |
| **Tooltip**  | Brief help text (hover only) |
| **Dropdown** | Action menus                 |

## Related Components

- [Dropdown](./Dropdown.md) - For action menus
- [Tooltip](./Tooltip.md) - For simple hover help
- [Dialog](./Dialog.md) - For modal dialogs

## References

- [Source](../../src/primitives/Popover.tsx)
- [Tests](../../src/primitives/__tests__/Popover.test.tsx)
- [Hooks: useDisclosure](../../src/hooks/useDisclosure.ts)
