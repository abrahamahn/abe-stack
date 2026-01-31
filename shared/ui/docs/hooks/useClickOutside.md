# useClickOutside

## Overview

Detects clicks outside a referenced element. Useful for closing dropdowns, modals, and popovers when clicking outside.

## Import

```tsx
import { useClickOutside } from '@abe-stack/ui';
```

## Signature

```tsx
function useClickOutside<T extends HTMLElement>(
  ref: React.RefObject<T | null>,
  handler: (event: MouseEvent | TouchEvent) => void,
): void;
```

## Parameters

| Parameter | Type                                        | Description                    |
| --------- | ------------------------------------------- | ------------------------------ |
| ref       | `React.RefObject<T \| null>`                | Ref to the element to monitor  |
| handler   | `(event: MouseEvent \| TouchEvent) => void` | Callback when clicking outside |

## Usage

### Basic Example

```tsx
function Dropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useClickOutside(ref, () => {
    setOpen(false);
  });

  return (
    <div ref={ref}>
      <button onClick={() => setOpen(true)}>Open</button>
      {open && <div>Dropdown content</div>}
    </div>
  );
}
```

### With Modal

```tsx
function Modal({ onClose }) {
  const modalRef = useRef<HTMLDivElement>(null);

  useClickOutside(modalRef, onClose);

  return (
    <div className="overlay">
      <div ref={modalRef} className="modal">
        Modal content
      </div>
    </div>
  );
}
```

## Behavior

- Listens to both `mousedown` and `touchstart` events
- Checks if click target is outside the referenced element
- Cleans up event listeners on unmount

## Do's and Don'ts

### Do

- Use for dropdown menus and popovers
- Combine with keyboard escape handling
- Ensure ref is attached to the correct container

### Don't

- Use for elements that should stay open on outside click
- Forget to handle the case when ref.current is null
- Attach to elements that might not be mounted

## Related Hooks

- [useDisclosure](./useDisclosure.md) - Open/close state management

## References

- [Source Code](../../src/hooks/useClickOutside.ts)
