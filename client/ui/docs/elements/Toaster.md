# Toaster

## Overview

A fixed-position toast notification container that displays messages. Accepts an array of messages and an onDismiss callback, making it easy to integrate with any state management solution.

## Import

```tsx
import { Toaster } from '@abe-stack/ui';
```

## Props

| Prop      | Type                                                           | Default       | Description                        |
| --------- | -------------------------------------------------------------- | ------------- | ---------------------------------- |
| messages  | `ToastMessage[]`                                               | (required)    | Array of toast messages to display |
| onDismiss | `(id: string) => void`                                         | (required)    | Callback when a toast is dismissed |
| position  | `'top-right' \| 'top-left' \| 'bottom-right' \| 'bottom-left'` | `'top-right'` | Position of the toaster            |

### ToastMessage Type

```tsx
type ToastMessage = {
  id: string;
  title?: string;
  description?: string;
};
```

## Usage

### Basic Example

```tsx
import { Toaster } from '@abe-stack/ui';

const [messages, setMessages] = useState([]);

const handleDismiss = (id) => {
  setMessages((prev) => prev.filter((m) => m.id !== id));
};

<Toaster messages={messages} onDismiss={handleDismiss} />;
```

### With toastStore (from shared/core)

```tsx
import { Toaster } from '@abe-stack/ui';
import { toastStore } from '@abe-stack/shared';

const MyToaster = () => {
  const { messages, dismiss } = toastStore();
  return <Toaster messages={messages} onDismiss={dismiss} />;
};
```

### Different Positions

```tsx
// Top left
<Toaster messages={messages} onDismiss={dismiss} position="top-left" />

// Bottom right
<Toaster messages={messages} onDismiss={dismiss} position="bottom-right" />

// Bottom left
<Toaster messages={messages} onDismiss={dismiss} position="bottom-left" />
```

### App-Specific Wrapper Pattern

The recommended pattern is to create an app-specific wrapper that connects to your toast store:

```tsx
// apps/web/src/components/Toaster.tsx
import { Toaster as ToasterBase } from '@abe-stack/ui';
import { toastStore } from '../stores/toastStore';

export const Toaster = () => {
  const { messages, dismiss } = toastStore();
  return <ToasterBase messages={messages} onDismiss={dismiss} />;
};
```

### Showing Toasts

```tsx
import { toastStore } from '@abe-stack/shared';

// Show a toast with title only
toastStore.getState().show({ title: 'Changes saved' });

// Show with title and description
toastStore.getState().show({
  title: 'Error',
  description: 'Failed to save changes. Please try again.',
});
```

## Behavior

- Fixed position with high z-index (9999) to overlay content
- Renders ToastContainer internally with proper styling
- Each toast can be dismissed individually via callback
- Position styles are applied based on the `position` prop

## Position Styles

| Position       | CSS                          |
| -------------- | ---------------------------- |
| `top-right`    | `top: 16px; right: 16px;`    |
| `top-left`     | `top: 16px; left: 16px;`     |
| `bottom-right` | `bottom: 16px; right: 16px;` |
| `bottom-left`  | `bottom: 16px; left: 16px;`  |

## Accessibility

- Toast messages are read by screen readers
- Dismiss buttons are keyboard accessible
- Uses semantic structure for content

## Do's and Don'ts

### Do

- Place Toaster at the app root level
- Use meaningful titles and descriptions
- Provide dismiss capability for all toasts
- Consider mobile viewports when positioning

### Don't

- Don't render multiple Toaster components
- Don't forget to connect onDismiss to state
- Don't use overly long messages
- Don't block important UI with toast position

## Related Components

- [Toast](../elements/Toast.md) - Individual toast element
- [toastStore](../../shared/core/src/stores/toastStore.ts) - Store for toast state

## References

- [Source Code](../../src/components/Toaster.tsx)
- [Tests](../../src/components/__tests__/Toaster.test.tsx)
