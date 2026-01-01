# Dialog

## Overview

A compound component for building accessible modal dialogs with proper ARIA implementation, focus trapping, and keyboard handling. Exports as `Dialog.Root`, `Dialog.Trigger`, `Dialog.Content`, etc.

## Import

```tsx
import { Dialog } from 'abeahn-ui/elements';
```

## Components

- `Dialog.Root` - Dialog container with state management
- `Dialog.Trigger` - Trigger button to open dialog
- `Dialog.Overlay` - Background overlay
- `Dialog.Content` - Dialog content container
- `Dialog.Title` - Dialog title (sets aria-labelledby)
- `Dialog.Description` - Dialog description (sets aria-describedby)

## Props

### Dialog.Root

| Prop                | Type                      | Default | Description                   |
| ------------------- | ------------------------- | ------- | ----------------------------- |
| children            | `ReactNode` (required)    | -       | Dialog components             |
| open                | `boolean`                 | -       | Controlled open state         |
| defaultOpen         | `boolean`                 | `false` | Initial open state            |
| onChange            | `(open: boolean) => void` | -       | Callback when state changes   |
| closeOnEscape       | `boolean`                 | `true`  | Close dialog on ESC key       |
| closeOnOverlayClick | `boolean`                 | `true`  | Close dialog on overlay click |

## Usage

### Basic Example

```tsx
<Dialog.Root>
  <Dialog.Trigger>Open Dialog</Dialog.Trigger>
  <Dialog.Content title="Dialog Title">
    <p>Dialog content goes here.</p>
  </Dialog.Content>
</Dialog.Root>
```

### Complete Example

```tsx
<Dialog.Root>
  <Dialog.Trigger>Delete Account</Dialog.Trigger>

  <Dialog.Content>
    <Dialog.Title>Confirm Deletion</Dialog.Title>
    <Dialog.Description>
      This action cannot be undone. Your account will be permanently deleted.
    </Dialog.Description>

    <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
      <button onClick={handleDelete}>Delete</button>
      <button onClick={() => setOpen(false)}>Cancel</button>
    </div>
  </Dialog.Content>
</Dialog.Root>
```

### Controlled

```tsx
const [open, setOpen] = useState(false);

<Dialog.Root open={open} onChange={setOpen}>
  <Dialog.Trigger>Open</Dialog.Trigger>
  <Dialog.Content title="Controlled Dialog">
    <button onClick={() => setOpen(false)}>Close</button>
  </Dialog.Content>
</Dialog.Root>;
```

### Prevent Close on Overlay Click

```tsx
<Dialog.Root closeOnOverlayClick={false}>
  <Dialog.Trigger>Open</Dialog.Trigger>
  <Dialog.Content title="Must Use Button">
    <p>You must use the close button.</p>
    <button onClick={() => setOpen(false)}>Close</button>
  </Dialog.Content>
</Dialog.Root>
```

### Form Dialog

```tsx
const [open, setOpen] = useState(false);

<Dialog.Root open={open} onChange={setOpen}>
  <Dialog.Trigger>Add User</Dialog.Trigger>

  <Dialog.Content>
    <Dialog.Title>Add New User</Dialog.Title>
    <form
      onSubmit={(e) => {
        e.preventDefault();
        handleSubmit();
        setOpen(false);
      }}
    >
      <Input label="Name" />
      <Input label="Email" type="email" />
      <button type="submit">Add User</button>
    </form>
  </Dialog.Content>
</Dialog.Root>;
```

## Keyboard Navigation

| Key             | Action                                   |
| --------------- | ---------------------------------------- |
| **Escape**      | Close dialog (if `closeOnEscape={true}`) |
| **Tab**         | Move focus within dialog (trapped)       |
| **Shift + Tab** | Move focus backward within dialog        |

## Accessibility

- Implements ARIA dialog pattern
- Uses `role="dialog"` and `aria-modal="true"`
- Auto-generates IDs for `aria-labelledby` and `aria-describedby`
- Focus trapped within dialog content
- Focus restored to trigger on close
- ESC key closes dialog
- Overlay click closes dialog (configurable)
- Renders via portal to document.body

## Do's and Don'ts

### Do

- Use `Dialog.Title` for accessible labeling
- Use `Dialog.Description` for additional context
- Provide a way to close (button, ESC, overlay)
- Keep dialogs focused on single task
- Test keyboard navigation
- Restore focus on close

### Don't

- Don't nest dialogs
- Don't put critical navigation in dialogs
- Don't make dialogs too large
- Don't forget to handle form submission
- Don't disable ESC key without good reason

## Related Components

- [Modal](./Modal.md) - Alternative dialog implementation
- [Overlay](./Overlay.md) - Background overlay component
- [FocusTrap](../components/FocusTrap.md) - Focus management

## References

- [Source](../../src/elements/Dialog.tsx)
- [Tests](../../src/elements/__tests__/Dialog.test.tsx)
- [Hooks: useControllableState](../../src/hooks/useControllableState.ts)
- [ARIA: Dialog Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)
