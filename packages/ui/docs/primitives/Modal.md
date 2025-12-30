# Modal

## Overview

A compound modal component with structured slots (Header, Body, Footer) and proper ARIA implementation. Alternative to Dialog with opinionated layout structure.

## Import

```tsx
import { Modal } from 'abeahn-ui/primitives';
```

## Components

- `Modal.Root` - Modal container with state management
- `Modal.Title` - Modal title
- `Modal.Description` - Modal description
- `Modal.Header` - Header section (flex container)
- `Modal.Body` - Body section (grid container)
- `Modal.Footer` - Footer section (flex, right-aligned)
- `Modal.Close` - Close button (calls onClose)

## Props

### Modal.Root

| Prop     | Type                   | Default | Description                                          |
| -------- | ---------------------- | ------- | ---------------------------------------------------- |
| open     | `boolean` (required)   | -       | Whether modal is open                                |
| onClose  | `() => void`           | -       | Close handler (called by ESC, overlay, Close button) |
| children | `ReactNode` (required) | -       | Modal content components                             |

## Usage

### Basic Example

```tsx
<Modal.Root open={open} onClose={() => setOpen(false)}>
  <Modal.Title>Modal Title</Modal.Title>
  <Modal.Body>
    <p>Modal content goes here.</p>
  </Modal.Body>
</Modal.Root>
```

### Complete Example

```tsx
const [open, setOpen] = useState(false);

<>
  <button onClick={() => setOpen(true)}>Open Modal</button>

  <Modal.Root open={open} onClose={() => setOpen(false)}>
    <Modal.Header>
      <Modal.Title>Confirm Action</Modal.Title>
    </Modal.Header>

    <Modal.Body>
      <Modal.Description>Are you sure you want to proceed?</Modal.Description>
      <p>Additional details here.</p>
    </Modal.Body>

    <Modal.Footer>
      <button onClick={() => setOpen(false)}>Cancel</button>
      <button
        onClick={() => {
          handleConfirm();
          setOpen(false);
        }}
      >
        Confirm
      </button>
    </Modal.Footer>
  </Modal.Root>
</>;
```

### Form Modal

```tsx
<Modal.Root open={open} onClose={() => setOpen(false)}>
  <Modal.Title>Add New Item</Modal.Title>

  <Modal.Body>
    <form
      id="add-form"
      onSubmit={(e) => {
        e.preventDefault();
        handleSubmit();
      }}
    >
      <Input label="Name" />
      <Input label="Description" />
    </form>
  </Modal.Body>

  <Modal.Footer>
    <Modal.Close>Cancel</Modal.Close>
    <button type="submit" form="add-form">
      Add Item
    </button>
  </Modal.Footer>
</Modal.Root>
```

### Simple Modal

```tsx
<Modal.Root open={open} onClose={() => setOpen(false)}>
  <Modal.Title>Simple Message</Modal.Title>
  <Modal.Body>
    <p>Your changes have been saved.</p>
  </Modal.Body>
  <Modal.Footer>
    <Modal.Close>OK</Modal.Close>
  </Modal.Footer>
</Modal.Root>
```

## Keyboard Navigation

| Key             | Action                            |
| --------------- | --------------------------------- |
| **Escape**      | Close modal and call `onClose`    |
| **Tab**         | Move focus within modal (trapped) |
| **Shift + Tab** | Move focus backward               |

## Accessibility

- Uses `role="dialog"` and `aria-modal="true"`
- Auto-manages `aria-labelledby` via Modal.Title
- Auto-manages `aria-describedby` via Modal.Description
- Focus trapped within modal
- ESC key closes modal
- Overlay click closes modal
- Renders via portal to document.body
- Includes Overlay and FocusTrap automatically

## Do's and Don'ts

### Do

- Always provide `Modal.Title` for accessibility
- Use `Modal.Footer` for actions
- Call `onClose` to close modal
- Keep modals focused on single task
- Use `Modal.Close` for cancel/close buttons

### Don't

- Don't nest modals
- Don't make modals too large
- Don't put critical navigation in modals
- Don't forget onClose handler
- Don't disable ESC key

## Modal vs Dialog

| Feature    | Modal                            | Dialog                |
| ---------- | -------------------------------- | --------------------- |
| Layout     | Opinionated (Header/Body/Footer) | Flexible              |
| Complexity | Simpler API                      | More granular control |
| Use Case   | Standard modals                  | Custom dialogs        |

## Related Components

- [Dialog](./Dialog.md) - Alternative dialog implementation
- [Overlay](./Overlay.md) - Background overlay
- [FocusTrap](../components/FocusTrap.md) - Focus trapping

## References

- [Source](../../src/primitives/Modal.tsx)
- [Tests](../../src/primitives/__tests__/Modal.test.tsx)
- [ARIA: Dialog Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)
