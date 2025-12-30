# Overlay

## Overview

A backdrop overlay component that renders a semi-transparent layer using React portals, commonly used with modals, dialogs, and dropdowns.

## Import

```tsx
import { Overlay } from 'abeahn-ui/primitives';
```

## Props

| Prop      | Type                              | Default | Description                                  |
| --------- | --------------------------------- | ------- | -------------------------------------------- |
| open      | `boolean` (required)              | -       | Whether the overlay is visible               |
| onClick   | `() => void`                      | -       | Click handler (typically to close)           |
| className | `string`                          | `''`    | Additional CSS classes to apply              |
| ...rest   | `ComponentPropsWithoutRef<'div'>` | -       | All standard HTML `<div>` attributes         |
| ref       | `Ref<HTMLDivElement>`             | -       | Forwarded ref to the overlay `<div>` element |

## Usage

### Basic Example

```tsx
const [open, setOpen] = useState(false);

<>
  <button onClick={() => setOpen(true)}>Open</button>
  <Overlay open={open} onClick={() => setOpen(false)} />
  {open && <YourContent />}
</>;
```

### With Modal

```tsx
const [showModal, setShowModal] = useState(false);

<>
  <button onClick={() => setShowModal(true)}>Open Modal</button>

  <Overlay open={showModal} onClick={() => setShowModal(false)} />

  {showModal && (
    <div className="modal">
      <h2>Modal Content</h2>
      <button onClick={() => setShowModal(false)}>Close</button>
    </div>
  )}
</>;
```

### Prevent Close on Click

```tsx
const [open, setOpen] = useState(false);

<Overlay
  open={open}
  onClick={(e) => {
    // Don't close when clicking overlay
    // Only close via explicit button
  }}
/>;
```

### With Close Confirmation

```tsx
const [open, setOpen] = useState(true);
const [hasUnsavedChanges, setHasUnsavedChanges] = useState(true);

<Overlay
  open={open}
  onClick={() => {
    if (hasUnsavedChanges) {
      if (confirm('You have unsaved changes. Close anyway?')) {
        setOpen(false);
      }
    } else {
      setOpen(false);
    }
  }}
/>;
```

### With Dropdown Menu

```tsx
const [menuOpen, setMenuOpen] = useState(false);

<>
  <button onClick={() => setMenuOpen(!menuOpen)}>Menu</button>

  <Overlay open={menuOpen} onClick={() => setMenuOpen(false)} />

  {menuOpen && (
    <div className="dropdown-menu" onClick={(e) => e.stopPropagation()}>
      <button
        onClick={() => {
          handleAction();
          setMenuOpen(false);
        }}
      >
        Action 1
      </button>
      <button
        onClick={() => {
          handleAction();
          setMenuOpen(false);
        }}
      >
        Action 2
      </button>
    </div>
  )}
</>;
```

### Custom Styling

```tsx
<Overlay
  open={open}
  onClick={handleClose}
  className="custom-overlay"
  style={{
    backgroundColor: 'rgba(0, 0, 0, 0.8)', // Darker
    backdropFilter: 'blur(4px)', // Blur effect
  }}
/>
```

## Behavior

- Renders to `document.body` via React portal
- Only renders when `open={true}`
- Waits for component mount before rendering (client-side only)
- Click events bubble from overlay to content
- Returns `null` when closed or not mounted

## Accessibility

- Overlay itself has no semantic meaning
- Should be used with accessible dialog/modal components
- Consider adding:
  - `aria-hidden="true"` on background content when overlay is open
  - Focus trap within modal/dialog
  - ESC key handler to close
  - Focus restoration when closed

### Recommended Pattern

```tsx
const [open, setOpen] = useState(false);

useEffect(() => {
  if (open) {
    // Trap focus in modal
    // Prevent body scroll
    document.body.style.overflow = 'hidden';

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handleEsc);

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleEsc);
    };
  }
}, [open]);

<>
  <div aria-hidden={open}>
    <MainContent />
  </div>

  <Overlay open={open} onClick={() => setOpen(false)} />

  {open && (
    <div role="dialog" aria-modal="true">
      <DialogContent />
    </div>
  )}
</>;
```

## Do's and Don'ts

### Do

- Use with modal/dialog components
- Provide a way to close (click overlay, ESC key, close button)
- Prevent body scroll when overlay is open
- Trap focus within modal content
- Use portals (handled automatically by component)
- Restore focus when closing

### Don't

- Don't use multiple overlays simultaneously
- Don't forget to handle ESC key
- Don't forget to prevent body scroll
- Don't forget `aria-hidden` on background content
- Don't rely solely on overlay click to close (provide explicit close button)

## Z-Index Considerations

The overlay renders at the end of `document.body`. Ensure your modal/dialog content has higher `z-index` than the overlay:

```css
.ui-overlay {
  z-index: 1000;
}

.modal-content {
  z-index: 1001;
}
```

## Related Components

- [Modal](./Modal.md) - Complete modal implementation with overlay
- [Dialog](./Dialog.md) - Accessible dialog component
- [FocusTrap](../components/FocusTrap.md) - For trapping focus

## References

- [Source](../../src/primitives/Overlay.tsx)
- [Tests](../../src/primitives/__tests__/Overlay.test.tsx)
- [React: Portals](https://react.dev/reference/react-dom/createPortal)
