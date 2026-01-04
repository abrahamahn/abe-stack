# useDisclosure

## Overview

Manages open/close state for modals, dropdowns, and other disclosure patterns. Supports both controlled and uncontrolled modes.

## Import

```tsx
import { useDisclosure } from '@abe-stack/ui';
```

## Signature

```tsx
function useDisclosure(props: UseDisclosureProps): {
  open: boolean;
  openFn: () => void;
  close: () => void;
  toggle: () => void;
  setOpen: (open: boolean) => void;
};
```

## Parameters

| Parameter   | Type                      | Default | Description                  |
| ----------- | ------------------------- | ------- | ---------------------------- |
| open        | `boolean \| undefined`    | -       | Controlled open state        |
| defaultOpen | `boolean`                 | `false` | Initial state (uncontrolled) |
| onChange    | `(open: boolean) => void` | -       | Callback when state changes  |

## Returns

| Property | Type                      | Description           |
| -------- | ------------------------- | --------------------- |
| open     | `boolean`                 | Current open state    |
| openFn   | `() => void`              | Opens the disclosure  |
| close    | `() => void`              | Closes the disclosure |
| toggle   | `() => void`              | Toggles the state     |
| setOpen  | `(open: boolean) => void` | Sets specific state   |

## Usage

### Modal Control

```tsx
function App() {
  const modal = useDisclosure();

  return (
    <div>
      <button onClick={modal.openFn}>Open Modal</button>
      <Modal open={modal.open} onClose={modal.close}>
        <p>Modal content</p>
        <button onClick={modal.close}>Close</button>
      </Modal>
    </div>
  );
}
```

### Dropdown Menu

```tsx
function Dropdown() {
  const { open, toggle, close } = useDisclosure();
  const ref = useRef(null);

  useClickOutside(ref, close);

  return (
    <div ref={ref}>
      <button onClick={toggle}>Menu</button>
      {open && (
        <ul>
          <li onClick={close}>Item 1</li>
          <li onClick={close}>Item 2</li>
        </ul>
      )}
    </div>
  );
}
```

### Controlled Mode

```tsx
function ControlledSidebar({ isOpen, onOpenChange }) {
  const sidebar = useDisclosure({
    open: isOpen,
    onChange: onOpenChange,
  });

  return (
    <aside data-open={sidebar.open}>
      <button onClick={sidebar.toggle}>Toggle</button>
    </aside>
  );
}
```

## Do's and Don'ts

### Do

- Use for modals, dropdowns, sidebars, accordions
- Combine with useClickOutside for dropdowns
- Use toggle for simple open/close buttons

### Don't

- Forget to provide close mechanism
- Mix controlled and uncontrolled at runtime
- Use for complex multi-state scenarios

## Related Hooks

- [useClickOutside](./useClickOutside.md) - Detect outside clicks
- [useControllableState](./useControllableState.md) - Base controllable state

## References

- [Source Code](../../src/hooks/useDisclosure.ts)
