# TextArea

## Overview

A styled textarea component for multi-line text input, providing consistent styling while supporting all standard textarea functionality.

## Import

```tsx
import { TextArea } from 'abeahn-ui/primitives';
```

## Props

| Prop      | Type                                   | Default | Description                               |
| --------- | -------------------------------------- | ------- | ----------------------------------------- |
| className | `string`                               | `''`    | Additional CSS classes to apply           |
| ...rest   | `ComponentPropsWithoutRef<'textarea'>` | -       | All standard HTML `<textarea>` attributes |
| ref       | `Ref<HTMLTextAreaElement>`             | -       | Forwarded ref to the `<textarea>` element |

## Usage

### Basic Example

```tsx
<TextArea placeholder="Enter your message..." />
```

### With Label

```tsx
<div>
  <label htmlFor="message">Message</label>
  <TextArea id="message" rows={4} />
</div>
```

### Controlled TextArea

```tsx
const [value, setValue] = useState('');

<TextArea value={value} onChange={(e) => setValue(e.target.value)} rows={5} />;
```

### With Character Limit

```tsx
const [value, setValue] = useState('');
const maxLength = 500;

<div>
  <TextArea
    value={value}
    onChange={(e) => setValue(e.target.value)}
    maxLength={maxLength}
    rows={6}
  />
  <div>
    {value.length} / {maxLength} characters
  </div>
</div>;
```

### Auto-growing TextArea

```tsx
<TextArea
  rows={3}
  style={{ resize: 'vertical', minHeight: '80px' }}
  placeholder="Type your message..."
/>
```

### Disabled State

```tsx
<TextArea disabled placeholder="Disabled textarea" />
```

## Accessibility

- Uses semantic `<textarea>` element
- Supports all standard HTML textarea attributes
- Always pair with visible or visually hidden labels
- Use `aria-invalid` and `aria-errormessage` for error states
- Provide `rows` attribute for reasonable default height

### Recommended ARIA Pattern

```tsx
<div>
  <label htmlFor="bio">Bio</label>
  <TextArea
    id="bio"
    aria-describedby="bio-help"
    aria-invalid={hasError}
    aria-errormessage={hasError ? 'bio-error' : undefined}
    rows={4}
  />
  <span id="bio-help">Tell us about yourself</span>
  {hasError && <span id="bio-error">Bio is required</span>}
</div>
```

## Do's and Don'ts

### Do

- Always provide accessible labels
- Set appropriate `rows` attribute for default height
- Allow users to resize (default browser behavior)
- Provide character count for limited-length fields
- Use `required` attribute for required fields
- Show clear error states with ARIA attributes

### Don't

- Don't use placeholder as the only label
- Don't disable resize without good reason
- Don't set `rows` too small (minimum 3-4)
- Don't forget to handle both controlled and uncontrolled patterns
- Don't rely solely on visual styling for validation feedback

## Related Components

- [InputPrimitive](./InputPrimitive.md) - For single-line text input
- [Input](../components/Input.md) - Higher-level input component

## References

- [Source](../../src/primitives/TextArea.tsx)
- [MDN: textarea element](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/textarea)
