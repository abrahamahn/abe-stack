# InputPrimitive

## Overview

A polymorphic input component that provides a styled foundation for form inputs while maintaining full control over the underlying element type.

## Import

```tsx
import { InputPrimitive } from 'abeahn-ui/primitives';
```

## Props

| Prop      | Type                                | Default   | Description                                                               |
| --------- | ----------------------------------- | --------- | ------------------------------------------------------------------------- |
| as        | `ElementType`                       | `'input'` | The HTML element or React component to render as                          |
| className | `string`                            | `''`      | Additional CSS classes to apply                                           |
| ...rest   | `ComponentPropsWithoutRef<'input'>` | -         | All standard HTML `<input>` attributes (or props for custom `as` element) |
| ref       | `Ref<HTMLElement>`                  | -         | Forwarded ref to the rendered element                                     |

## Usage

### Basic Example

```tsx
<InputPrimitive type="text" placeholder="Enter text..." />
```

### Different Input Types

```tsx
<InputPrimitive type="email" placeholder="Email" />
<InputPrimitive type="password" placeholder="Password" />
<InputPrimitive type="number" placeholder="Age" />
<InputPrimitive type="search" placeholder="Search..." />
```

### With Labels

```tsx
<div>
  <label htmlFor="username">Username</label>
  <InputPrimitive id="username" type="text" />
</div>
```

### Controlled Input

```tsx
const [value, setValue] = useState('');

<InputPrimitive type="text" value={value} onChange={(e) => setValue(e.target.value)} />;
```

### Polymorphic Rendering

```tsx
{
  /* Render as a custom component */
}
<InputPrimitive as={CustomInput} />;
```

### Disabled State

```tsx
<InputPrimitive type="text" disabled placeholder="Disabled input" />
```

## Accessibility

- Uses semantic `<input>` element by default
- Supports all standard HTML input attributes (`aria-label`, `aria-describedby`, etc.)
- Always pair with visible or visually hidden labels
- Use `aria-invalid` and `aria-errormessage` for error states
- Ensure proper keyboard navigation with `tabIndex`

### Recommended ARIA Pattern

```tsx
<div>
  <label htmlFor="email">Email</label>
  <InputPrimitive
    id="email"
    type="email"
    aria-describedby="email-help"
    aria-invalid={hasError}
    aria-errormessage={hasError ? 'email-error' : undefined}
  />
  <span id="email-help">Enter your email address</span>
  {hasError && <span id="email-error">Invalid email format</span>}
</div>
```

## Do's and Don'ts

### Do

- Always provide accessible labels (visible or visually hidden)
- Use appropriate `type` attribute for semantic correctness
- Include helpful placeholder text when appropriate
- Provide clear error messages with ARIA attributes
- Use `required` attribute for required fields

### Don't

- Don't use placeholder as the only label
- Don't rely solely on visual styling to indicate errors
- Don't override browser autofill behavior unnecessarily
- Don't forget to handle both controlled and uncontrolled patterns appropriately
- Don't use custom `as` prop unless necessary for advanced use cases

## Related Components

- [Input](../components/Input.md) - Higher-level input component with label integration
- [TextArea](./TextArea.md) - For multi-line text input
- [Checkbox](./Checkbox.md) - For boolean inputs
- [Radio](./Radio.md) - For mutually exclusive options

## References

- [Source](../../src/primitives/InputPrimitive.tsx)
- [MDN: input element](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input)
- [WCAG: Input Purposes](https://www.w3.org/WAI/WCAG21/Understanding/identify-input-purpose.html)
