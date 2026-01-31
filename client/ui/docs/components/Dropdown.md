# Dropdown

## Overview

A dropdown menu component for displaying contextual actions or options, with keyboard navigation and flexible content via render props.

## Import

```tsx
import { Dropdown } from 'abeahn-ui/elements';
```

## Props

| Prop        | Type                                                         | Default    | Description                               |
| ----------- | ------------------------------------------------------------ | ---------- | ----------------------------------------- |
| trigger     | `ReactNode` (required)                                       | -          | Trigger button content                    |
| children    | `ReactNode \| ((close: () => void) => ReactNode)` (required) | -          | Menu content or render function           |
| placement   | `'bottom' \| 'right'`                                        | `'bottom'` | Menu position relative to trigger         |
| open        | `boolean`                                                    | -          | Controlled open state                     |
| defaultOpen | `boolean`                                                    | `false`    | Initial open state for uncontrolled usage |
| onChange    | `(open: boolean) => void`                                    | -          | Callback when open state changes          |

## Usage

### Basic Example

```tsx
<Dropdown trigger={<button>Menu</button>}>
  <MenuItem>Edit</MenuItem>
  <MenuItem>Delete</MenuItem>
  <MenuItem>Share</MenuItem>
</Dropdown>
```

### With Render Prop (Auto-close)

```tsx
<Dropdown trigger={<button>Actions</button>}>
  {(close) => (
    <>
      <MenuItem
        onClick={() => {
          handleEdit();
          close();
        }}
      >
        Edit
      </MenuItem>
      <MenuItem
        onClick={() => {
          handleDelete();
          close();
        }}
      >
        Delete
      </MenuItem>
    </>
  )}
</Dropdown>
```

### Different Placements

```tsx
<Dropdown trigger={<button>Bottom</button>} placement="bottom">
  <MenuItem>Option 1</MenuItem>
</Dropdown>

<Dropdown trigger={<button>Right</button>} placement="right">
  <MenuItem>Option 1</MenuItem>
</Dropdown>
```

### Controlled

```tsx
const [menuOpen, setMenuOpen] = useState(false);

<Dropdown trigger={<button>Menu</button>} open={menuOpen} onChange={setMenuOpen}>
  <MenuItem onClick={() => setMenuOpen(false)}>Close Menu</MenuItem>
</Dropdown>;
```

### Context Menu Pattern

```tsx
<div
  onContextMenu={(e) => {
    e.preventDefault();
    setMenuOpen(true);
  }}
>
  Right-click me
  <Dropdown trigger={<button style={{ display: 'none' }} />} open={menuOpen} onChange={setMenuOpen}>
    <MenuItem>Copy</MenuItem>
    <MenuItem>Paste</MenuItem>
  </Dropdown>
</div>
```

### With Icons

```tsx
<Dropdown
  trigger={
    <button>
      <IconMenu />
    </button>
  }
>
  {(close) => (
    <>
      <MenuItem
        onClick={() => {
          handleEdit();
          close();
        }}
      >
        <IconEdit /> Edit
      </MenuItem>
      <MenuItem
        onClick={() => {
          handleDelete();
          close();
        }}
      >
        <IconTrash /> Delete
      </MenuItem>
    </>
  )}
</Dropdown>
```

## Keyboard Navigation

| Key               | Action                                 |
| ----------------- | -------------------------------------- |
| **Enter / Space** | Open menu                              |
| **ArrowDown**     | Open menu and focus first item         |
| **ArrowUp**       | Open menu and focus last item          |
| **Escape**        | Close menu and return focus to trigger |

## Accessibility

- Uses `role="menu"` for menu container
- Trigger button has `aria-haspopup="menu"` and `aria-expanded`
- ESC key closes menu and restores focus to trigger
- Arrow keys move focus to menu items
- Screen readers announce menu state

## Do's and Don'ts

### Do

- Use for contextual actions
- Provide clear trigger labels
- Use MenuItem components for items
- Close menu after action selection
- Implement keyboard navigation
- Use render prop pattern for auto-close

### Don't

- Don't use for navigation (use nav/links)
- Don't nest dropdowns deeply
- Don't put forms inside dropdowns
- Don't forget to handle focus management
- Don't make trigger too small

## Related Components

- [MenuItem](./MenuItem.md) - For menu items
- [Popover](./Popover.md) - For rich content
- [Select](./Select.md) - For form selections

## References

- [Source](../../src/elements/Dropdown.tsx)
- [Tests](../../src/elements/__tests__/Dropdown.test.tsx)
- [Hooks: useDisclosure](../../src/hooks/useDisclosure.ts)
- [ARIA: Menu Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/menu/)
