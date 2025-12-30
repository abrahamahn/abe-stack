# FocusTrap

## Overview

A component that traps keyboard focus within its children, preventing Tab navigation from leaving the container. Used in modals, dialogs, and other overlay components.

## Import

```tsx
import { FocusTrap } from 'abeahn-ui/components';
```

## Props

| Prop     | Type                   | Default | Description                  |
| -------- | ---------------------- | ------- | ---------------------------- |
| children | `ReactNode` (required) | -       | Content to trap focus within |

## Usage

### Basic Example

```tsx
<FocusTrap>
  <div>
    <button>First</button>
    <button>Second</button>
    <button>Last</button>
  </div>
</FocusTrap>
```

### In Modal

```tsx
const [open, setOpen] = useState(false);

{
  open && (
    <div className="modal">
      <FocusTrap>
        <div>
          <h2>Modal Title</h2>
          <p>Modal content</p>
          <button onClick={() => setOpen(false)}>Close</button>
        </div>
      </FocusTrap>
    </div>
  );
}
```

### In Dropdown Menu

```tsx
<FocusTrap>
  <div role="menu">
    <button role="menuitem">Edit</button>
    <button role="menuitem">Delete</button>
    <button role="menuitem">Share</button>
  </div>
</FocusTrap>
```

## Behavior

- On mount, focuses first focusable element
- Tab from last element cycles to first element
- Shift+Tab from first element cycles to last element
- On unmount, restores focus to previously focused element
- Only traps Tab key navigation (other keys work normally)

### Focusable Elements

FocusTrap recognizes these elements as focusable:

- `<a href="...">`
- `<button>` (not disabled)
- `<input>` (not disabled)
- `<textarea>` (not disabled)
- `<select>` (not disabled)
- Elements with `tabindex` (except `tabindex="-1"`)

## Accessibility

- Essential for modal dialogs per ARIA guidelines
- Prevents keyboard users from leaving modal context
- Automatically restores focus on unmount
- Does not prevent screen reader navigation (Virtual Cursor)
- Works with all standard focusable elements

## Do's and Don'ts

### Do

- Use in modals and dialogs
- Use in dropdown menus
- Ensure there's at least one focusable element
- Provide a way to close/exit
- Test with keyboard navigation

### Don't

- Don't use on entire page
- Don't nest focus traps
- Don't trap focus without user action (modal open, menu click)
- Don't forget to provide exit mechanism
- Don't use if content has no focusable elements

## Common Patterns

### Modal with Close Button

```tsx
<FocusTrap>
  <div className="modal">
    <button aria-label="Close" onClick={onClose} style={{ position: 'absolute', top: 8, right: 8 }}>
      ×
    </button>
    <div>{content}</div>
  </div>
</FocusTrap>
```

### Form Dialog

```tsx
<FocusTrap>
  <div role="dialog" aria-labelledby="dialog-title">
    <h2 id="dialog-title">Edit Profile</h2>
    <form onSubmit={handleSubmit}>
      <input type="text" placeholder="Name" />
      <input type="email" placeholder="Email" />
      <button type="submit">Save</button>
      <button type="button" onClick={onClose}>
        Cancel
      </button>
    </form>
  </div>
</FocusTrap>
```

## Related Components

- [Modal](../primitives/Modal.md) - Uses FocusTrap internally
- [Dialog](../primitives/Dialog.md) - Uses FocusTrap internally
- [Dropdown](../primitives/Dropdown.md) - Could benefit from FocusTrap

## References

- [Source](../../src/components/FocusTrap.tsx)
- [ARIA: Dialog Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)
- [WCAG: Focus Order](https://www.w3.org/WAI/WCAG21/Understanding/focus-order.html)
