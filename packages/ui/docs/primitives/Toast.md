# Toast

## Overview

Temporary notification components that display brief messages to users, automatically dismissing after a configurable duration.

This primitive exports two components:

- `Toast` - Individual toast message
- `ToastContainer` - Container for managing multiple toasts

## Import

```tsx
import { Toast, ToastContainer } from 'abeahn-ui/primitives';
```

## Toast Props

| Prop      | Type                      | Default | Description                             |
| --------- | ------------------------- | ------- | --------------------------------------- |
| message   | `ToastMessage` (required) | -       | Toast message object                    |
| duration  | `number`                  | `3500`  | Auto-dismiss duration in milliseconds   |
| onDismiss | `(id: string) => void`    | -       | Callback when toast should be dismissed |

## ToastMessage Type

```tsx
type ToastMessage = {
  id: string; // Unique identifier
  title?: string; // Toast heading (bold)
  description?: string; // Toast description (muted)
};
```

## ToastContainer Props

| Prop      | Type                        | Default | Description                        |
| --------- | --------------------------- | ------- | ---------------------------------- |
| messages  | `ToastMessage[]` (required) | -       | Array of active toast messages     |
| onDismiss | `(id: string) => void`      | -       | Callback when a toast is dismissed |

## Usage

### Basic Toast Manager

```tsx
const [toasts, setToasts] = useState<ToastMessage[]>([]);

const addToast = (title: string, description?: string) => {
  const id = Math.random().toString(36).substring(7);
  setToasts((prev) => [...prev, { id, title, description }]);
};

const removeToast = (id: string) => {
  setToasts((prev) => prev.filter((t) => t.id !== id));
};

<>
  <button onClick={() => addToast('Success', 'Your changes have been saved')}>Show Toast</button>

  <ToastContainer messages={toasts} onDismiss={removeToast} />
</>;
```

### Different Toast Types

```tsx
const showSuccess = () => {
  addToast('Success', 'Operation completed successfully');
};

const showError = () => {
  addToast('Error', 'Something went wrong');
};

const showInfo = () => {
  addToast('New message', 'You have 3 unread notifications');
};

const showSimple = () => {
  addToast('Copied to clipboard');
};
```

### Custom Duration

```tsx
const [toasts, setToasts] = useState<ToastMessage[]>([]);

<div>
  {toasts.map((toast) => (
    <Toast
      key={toast.id}
      message={toast}
      duration={5000} // 5 seconds
      onDismiss={removeToast}
    />
  ))}
</div>;
```

### Form Submission Example

```tsx
const handleSubmit = async (data: FormData) => {
  try {
    await api.submit(data);
    addToast('Success', 'Form submitted successfully');
  } catch (error) {
    addToast('Error', error.message);
  }
};
```

### Complete Toast System

```tsx
import { useState, useCallback } from 'react';

function useToast() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((title: string, description?: string) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, title, description }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { toasts, addToast, removeToast };
}

// Usage
function App() {
  const { toasts, addToast, removeToast } = useToast();

  return (
    <>
      <button onClick={() => addToast('Hello', 'This is a toast!')}>Show Toast</button>
      <ToastContainer messages={toasts} onDismiss={removeToast} />
    </>
  );
}
```

### Title Only

```tsx
addToast('Copied!'); // Only title, no description
```

### Description Only

```tsx
setToasts([
  {
    id: '1',
    description: 'Your session will expire in 5 minutes',
  },
]);
```

## Behavior

- Individual toasts auto-dismiss after `duration` milliseconds
- Timer starts immediately when toast mounts
- Timer is cleaned up when component unmounts
- Title appears in bold
- Description appears with reduced opacity
- ToastContainer manages multiple toasts

## Accessibility

- Consider adding `role="status"` or `role="alert"` to toast cards
- Important messages should use `role="alert"` for immediate announcement
- Provide sufficient contrast for text
- Ensure toasts don't block critical UI
- Allow users to pause/dismiss toasts

### Improved Accessibility Example

```tsx
<div
  className="ui-toast-card"
  role={isUrgent ? 'alert' : 'status'}
  aria-live={isUrgent ? 'assertive' : 'polite'}
  aria-atomic="true"
>
  {/* Toast content */}
</div>
```

## Do's and Don'ts

### Do

- Keep messages concise (1-2 sentences)
- Use for non-critical, temporary information
- Provide clear, actionable messages
- Use appropriate duration (3-5 seconds)
- Position toasts where they won't obstruct content
- Generate unique IDs for each toast

### Don't

- Don't use for critical errors requiring action (use Dialog/Alert instead)
- Don't show too many toasts simultaneously
- Don't use very short durations (<2 seconds)
- Don't use for lengthy messages
- Don't block user interaction with toasts
- Don't forget to clean up toasts on unmount

## Positioning

The default CSS positions toasts. Customize via CSS:

```css
.ui-toast {
  /* Common positions: */
  /* Top center */
  top: 16px;
  left: 50%;
  transform: translateX(-50%);

  /* Top right */
  top: 16px;
  right: 16px;

  /* Bottom right */
  bottom: 16px;
  right: 16px;
}
```

## Related Components

- [Alert](./Alert.md) - For persistent messages
- [Dialog](./Dialog.md) - For important messages requiring action

## References

- [Source](../../src/primitives/Toast.tsx)
- [Tests](../../src/primitives/__tests__/Toast.test.tsx)
- [ARIA: status role](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Roles/status_role)
- [ARIA: alert role](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Roles/alert_role)
