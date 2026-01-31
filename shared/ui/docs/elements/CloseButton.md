# CloseButton

A minimal close button for panels, cards, and overlays. Positioned for top-right corner placement in flex containers.

## Import

```tsx
import { CloseButton } from '@abe-stack/ui';
```

## Usage

```tsx
<CloseButton onClick={handleClose} />

// With custom aria-label
<CloseButton aria-label="Dismiss notification" onClick={handleDismiss} />

// With custom content
<CloseButton>Close</CloseButton>
```

## Props

| Prop         | Type         | Default   | Description                     |
| ------------ | ------------ | --------- | ------------------------------- |
| `aria-label` | `string`     | `"Close"` | Accessible label for the button |
| `className`  | `string`     | `""`      | Additional CSS class names      |
| `children`   | `ReactNode`  | `"✕"`     | Button content (defaults to X)  |
| `onClick`    | `() => void` | -         | Click handler                   |

Extends all native `<button>` props.

## Styling

Uses the `.close-btn` class from elements.css. Designed to be positioned in flex containers with minimal styling.
