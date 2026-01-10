# Button

## Overview

A polymorphic button component with multiple variants and sizes for various use cases and visual hierarchies.

## Import

```tsx
import { Button } from 'abeahn-ui/components';
```

## Props

| Prop      | Type                                 | Default     | Description                                                                |
| --------- | ------------------------------------ | ----------- | -------------------------------------------------------------------------- |
| as        | `ElementType`                        | `'button'`  | The HTML element or React component to render as                           |
| variant   | `'primary' \| 'secondary' \| 'text'` | `'primary'` | Visual style variant                                                       |
| size      | `'small' \| 'medium' \| 'large'`     | `'medium'`  | Button size                                                                |
| type      | `'button' \| 'submit' \| 'reset'`    | `'button'`  | Button type attribute                                                      |
| className | `string`                             | `''`        | Additional CSS classes to apply                                            |
| ...rest   | `ComponentPropsWithoutRef<'button'>` | -           | All standard HTML `<button>` attributes (or props for custom `as` element) |
| ref       | `Ref<HTMLElement>`                   | -           | Forwarded ref to the rendered element                                      |

## Usage

### Basic Example

```tsx
<Button>Click me</Button>
```

### Variants

```tsx
<Button variant="primary">Primary</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="text">Text Button</Button>
```

### Sizes

```tsx
<Button size="small">Small</Button>
<Button size="medium">Medium</Button>
<Button size="large">Large</Button>
```

### Combined

```tsx
<Button variant="primary" size="large">
  Large Primary
</Button>

<Button variant="secondary" size="small">
  Small Secondary
</Button>
```

### Disabled State

```tsx
<Button disabled>Disabled Button</Button>
<Button variant="primary" disabled>
  Disabled Primary
</Button>
```

### Submit Button (Form)

```tsx
<form onSubmit={handleSubmit}>
  <input type="text" />
  <Button type="submit" variant="primary">
    Submit
  </Button>
</form>
```

### Polymorphic as Link

```tsx
<Button as="a" href="/profile" variant="secondary">
  Go to Profile
</Button>
```

### With React Router Link

```tsx
import { Link } from 'react-router-dom';

<Button as={Link} to="/dashboard" variant="primary">
  Dashboard
</Button>;
```

### Loading State

```tsx
const [loading, setLoading] = useState(false);

<Button disabled={loading} onClick={handleAction}>
  {loading ? (
    <>
      <Spinner size="16px" />
      <span style={{ marginLeft: '8px' }}>Loading...</span>
    </>
  ) : (
    'Submit'
  )}
</Button>;
```

### With Icons

```tsx
<Button>
  <IconPlus />
  <span style={{ marginLeft: '8px' }}>Add Item</span>
</Button>

<Button variant="text">
  <IconEdit />
  <span style={{ marginLeft: '8px' }}>Edit</span>
</Button>
```

### Icon Only

```tsx
<Button aria-label="Close" variant="text">
  <IconClose />
</Button>

<Button aria-label="Settings">
  <IconSettings />
</Button>
```

### Button Group

```tsx
<div style={{ display: 'flex', gap: '8px' }}>
  <Button variant="primary">Save</Button>
  <Button variant="secondary">Cancel</Button>
  <Button variant="text">Delete</Button>
</div>
```

### Destructive Action

```tsx
<Button variant="secondary" className="btn-destructive" onClick={handleDelete}>
  Delete Account
</Button>
```

## Accessibility

- Uses semantic `<button>` element by default
- Keyboard accessible (Enter/Space to activate)
- Type defaults to "button" to prevent accidental form submission
- Supports all ARIA attributes via spread props
- Disabled state properly communicated

### Icon Buttons

Always provide accessible labels:

```tsx
{
  /* Good */
}
<Button aria-label="Close dialog">
  <IconClose />
</Button>;

{
  /* Also good */
}
<Button>
  <IconSave />
  <span>Save</span>
</Button>;
```

### Loading States

Communicate loading to screen readers:

```tsx
<Button disabled={loading} aria-busy={loading} aria-live="polite">
  {loading ? 'Loading...' : 'Submit'}
</Button>
```

## Do's and Don'ts

### Do

- Use `variant="primary"` for the main action
- Use `variant="secondary"` for alternative actions
- Use `variant="text"` for tertiary/low-priority actions
- Provide clear, action-oriented labels ("Save", "Delete", "Continue")
- Use appropriate size for context
- Add `aria-label` for icon-only buttons
- Use `type="submit"` in forms
- Handle loading states

### Don't

- Don't use multiple primary buttons in the same context
- Don't use vague labels ("Click here", "OK")
- Don't forget to handle disabled and loading states
- Don't make buttons too small (minimum 44x44px touch target)
- Don't rely solely on color to indicate button purpose
- Don't use button for navigation (use Link component with `as` prop)

## Variant Guide

| Variant     | Use Case           | Example                    |
| ----------- | ------------------ | -------------------------- |
| `primary`   | Main action        | Save, Submit, Create       |
| `secondary` | Alternative action | Cancel, Back, More Options |
| `text`      | Tertiary action    | Skip, Learn More, Dismiss  |

## Size Guide

| Size     | Use Case                | Height |
| -------- | ----------------------- | ------ |
| `small`  | Compact UI, tables      | ~32px  |
| `medium` | Default                 | ~40px  |
| `large`  | Hero sections, emphasis | ~48px  |

## Related Components

- [MenuItem](../elements/MenuItem.md) - For menu buttons
- [Switch](../elements/Switch.md) - For toggle actions

## References

- [Source](../../src/components/Button.tsx)
- [Styles](../../src/components/Button.css)
