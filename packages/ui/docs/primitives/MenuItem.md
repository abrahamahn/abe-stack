# MenuItem

## Overview

A styled button component designed for menu items in dropdowns, context menus, and navigation menus.

## Import

```tsx
import { MenuItem } from 'abeahn-ui/primitives';
```

## Props

| Prop      | Type                                 | Default    | Description                             |
| --------- | ------------------------------------ | ---------- | --------------------------------------- |
| type      | `'button' \| 'submit' \| 'reset'`    | `'button'` | Button type attribute                   |
| className | `string`                             | `''`       | Additional CSS classes to apply         |
| ...rest   | `ComponentPropsWithoutRef<'button'>` | -          | All standard HTML `<button>` attributes |
| ref       | `Ref<HTMLButtonElement>`             | -          | Forwarded ref to the `<button>` element |

## Usage

### Basic Example

```tsx
<MenuItem onClick={() => console.log('Clicked')}>Menu Item</MenuItem>
```

### In a Menu List

```tsx
<div role="menu">
  <MenuItem onClick={() => console.log('Edit')}>Edit</MenuItem>
  <MenuItem onClick={() => console.log('Copy')}>Copy</MenuItem>
  <MenuItem onClick={() => console.log('Delete')}>Delete</MenuItem>
</div>
```

### With Icons

```tsx
<div role="menu">
  <MenuItem onClick={handleEdit}>
    <IconEdit /> Edit
  </MenuItem>
  <MenuItem onClick={handleDelete}>
    <IconDelete /> Delete
  </MenuItem>
</div>
```

### With Keyboard Shortcuts

```tsx
<MenuItem onClick={handleSave}>
  Save
  <span style={{ marginLeft: 'auto', opacity: 0.6 }}>⌘S</span>
</MenuItem>
```

### Disabled State

```tsx
<MenuItem disabled onClick={handleAction}>
  Unavailable Action
</MenuItem>
```

### Destructive Action

```tsx
<MenuItem
  onClick={handleDelete}
  className="destructive"
  aria-label="Delete item (cannot be undone)"
>
  Delete
</MenuItem>
```

## Accessibility

- Uses semantic `<button>` element
- Keyboard accessible by default (Space/Enter to activate)
- Should be contained within `role="menu"` or similar navigation pattern
- Automatically prevented from form submission (type="button" default)
- Support for disabled state
- Screen readers announce as button

### Recommended Menu Pattern

```tsx
<div role="menu" aria-label="Actions">
  <MenuItem onClick={handleAction} role="menuitem">
    Action Label
  </MenuItem>
</div>
```

### With Arrow Key Navigation

```tsx
const menuItems = ['Edit', 'Copy', 'Paste', 'Delete'];

<div role="menu" onKeyDown={handleArrowKeys}>
  {menuItems.map((item, index) => (
    <MenuItem
      key={item}
      onClick={() => handleAction(item)}
      role="menuitem"
      tabIndex={index === focusedIndex ? 0 : -1}
    >
      {item}
    </MenuItem>
  ))}
</div>;
```

## Do's and Don'ts

### Do

- Use within proper menu/navigation context
- Provide clear, action-oriented labels
- Implement keyboard navigation for menus
- Use icons to improve scannability
- Group related menu items together
- Disable items that aren't currently available
- Use consistent ordering across similar menus

### Don't

- Don't use for non-menu contexts (use Button component)
- Don't forget onClick handlers (makes item non-functional)
- Don't use vague labels like "Click here"
- Don't create overly nested menu structures
- Don't make destructive actions too easy to trigger accidentally
- Don't rely solely on icons without text labels

## Related Components

- [Button](../components/Button.md) - For general-purpose buttons
- [Dropdown](./Dropdown.md) - Menu container component
- [Popover](./Popover.md) - For popover-based menus

## References

- [Source](../../src/primitives/MenuItem.tsx)
- [ARIA: menuitem role](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Roles/menuitem_role)
- [ARIA Authoring Practices: Menu Button](https://www.w3.org/WAI/ARIA/apg/patterns/menu-button/)
