# Alert

## Overview

A component for displaying contextual feedback messages with support for different tones, icons, and titles.

## Import

```tsx
import { Alert } from 'abeahn-ui/primitives';
```

## Props

| Prop      | Type                                           | Default  | Description                                    |
| --------- | ---------------------------------------------- | -------- | ---------------------------------------------- |
| tone      | `'info' \| 'success' \| 'danger' \| 'warning'` | `'info'` | Visual style variant indicating message type   |
| icon      | `ReactNode`                                    | -        | Optional icon element to display               |
| title     | `ReactNode`                                    | -        | Optional title/heading for the alert           |
| children  | `ReactNode`                                    | -        | Alert message content                          |
| className | `string`                                       | `''`     | Additional CSS classes to apply                |
| ...rest   | `ComponentPropsWithoutRef<'div'>`              | -        | All standard HTML `<div>` attributes           |
| ref       | `Ref<HTMLDivElement>`                          | -        | Forwarded ref to the container `<div>` element |

## Usage

### Basic Example

```tsx
<Alert>This is an informational message.</Alert>
```

### Different Tones

```tsx
<Alert tone="info">Here's some information.</Alert>
<Alert tone="success">Operation completed successfully!</Alert>
<Alert tone="warning">Please review your changes.</Alert>
<Alert tone="danger">An error occurred. Please try again.</Alert>
```

### With Title

```tsx
<Alert tone="success" title="Success">
  Your changes have been saved.
</Alert>
```

### With Icon

```tsx
<Alert tone="warning" icon={<IconWarning />}>
  Your session will expire in 5 minutes.
</Alert>
```

### With Icon and Title

```tsx
<Alert tone="danger" icon={<IconError />} title="Error">
  Unable to process your request. Please contact support.
</Alert>
```

### Rich Content

```tsx
<Alert tone="info" title="New Features Available">
  <p>We've added several improvements:</p>
  <ul>
    <li>Dark mode support</li>
    <li>Keyboard shortcuts</li>
    <li>Export functionality</li>
  </ul>
</Alert>
```

### Dismissible Alert Pattern

```tsx
const [visible, setVisible] = useState(true);

{
  visible && (
    <Alert tone="info">
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span>This is a dismissible alert.</span>
        <button onClick={() => setVisible(false)}>Dismiss</button>
      </div>
    </Alert>
  );
}
```

## Accessibility

- Uses `role="status"` for screen reader announcements
- Status role ensures alerts are announced politely without interrupting
- Icons are decorative; tone is conveyed through text and styling
- Consider using `role="alert"` for urgent messages requiring immediate attention
- Title uses semantic heading markup (bold text)

### For Urgent Messages

```tsx
<Alert tone="danger" role="alert" aria-live="assertive">
  Critical error: System shutting down.
</Alert>
```

## Do's and Don'ts

### Do

- Use appropriate `tone` to match message severity
- Keep alert messages concise and actionable
- Provide clear next steps or actions
- Use `title` to summarize the message
- Use icons to reinforce visual tone
- Place alerts near relevant context

### Don't

- Don't use alerts for trivial information
- Don't stack too many alerts simultaneously
- Don't use danger tone for non-critical messages
- Don't make alerts too long (move details elsewhere)
- Don't forget to test with screen readers
- Don't use alerts as the only error communication method

## Related Components

- [Toast](./Toast.md) - For temporary notifications
- [Modal](./Modal.md) - For blocking important messages
- [Badge](./Badge.md) - For status indicators

## References

- [Source](../../src/primitives/Alert.tsx)
- [ARIA: status role](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Roles/status_role)
- [ARIA: alert role](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Roles/alert_role)
