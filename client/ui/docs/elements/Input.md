# Input

## Overview

A higher-level input component that wraps InputElement with integrated label, description, and error message support for complete form fields.

## Import

```tsx
import { Input } from 'abeahn-ui/components';
```

## Props

| Prop        | Type                                | Default        | Description                               |
| ----------- | ----------------------------------- | -------------- | ----------------------------------------- |
| as          | `ElementType`                       | `'input'`      | The HTML element to render as             |
| label       | `string`                            | -              | Visible label text for the input          |
| description | `string`                            | -              | Helper text displayed below the input     |
| error       | `string`                            | -              | Error message (also sets `aria-invalid`)  |
| id          | `string`                            | auto-generated | Input ID (auto-generated if not provided) |
| className   | `string`                            | -              | Additional CSS classes for the input      |
| ...rest     | `ComponentPropsWithoutRef<'input'>` | -              | All standard HTML `<input>` attributes    |
| ref         | `Ref<HTMLInputElement>`             | -              | Forwarded ref to the `<input>` element    |

## Usage

### Basic Example

```tsx
<Input label="Email" type="email" />
```

### With Description

```tsx
<Input label="Username" description="Choose a unique username (3-20 characters)" type="text" />
```

### With Error

```tsx
const [email, setEmail] = useState('');
const [error, setError] = useState('');

<Input
  label="Email"
  type="email"
  value={email}
  onChange={(e) => {
    setEmail(e.target.value);
    if (!e.target.value.includes('@')) {
      setError('Please enter a valid email');
    } else {
      setError('');
    }
  }}
  error={error}
/>;
```

### Required Field

```tsx
<Input label="Password" type="password" required description="Must be at least 8 characters" />
```

### Form Example

```tsx
const [formData, setFormData] = useState({
  name: '',
  email: '',
  phone: '',
});

const [errors, setErrors] = useState({});

<form onSubmit={handleSubmit}>
  <Input
    label="Full Name"
    value={formData.name}
    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
    error={errors.name}
    required
  />

  <Input
    label="Email Address"
    type="email"
    value={formData.email}
    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
    error={errors.email}
    description="We'll never share your email"
    required
  />

  <Input
    label="Phone Number"
    type="tel"
    value={formData.phone}
    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
    error={errors.phone}
    description="Optional"
  />

  <Button type="submit">Submit</Button>
</form>;
```

### Different Input Types

```tsx
<Input label="Name" type="text" />
<Input label="Email" type="email" />
<Input label="Password" type="password" />
<Input label="Phone" type="tel" />
<Input label="Website" type="url" />
<Input label="Age" type="number" min={0} max={120} />
<Input label="Birthdate" type="date" />
```

### Disabled State

```tsx
<Input label="Username" value="johndoe" disabled />
```

### Placeholder

```tsx
<Input label="Search" type="search" placeholder="Enter search term..." />
```

### With Validation

```tsx
const [password, setPassword] = useState('');

const validatePassword = (value: string) => {
  if (value.length < 8) {
    return 'Password must be at least 8 characters';
  }
  if (!/\d/.test(value)) {
    return 'Password must contain at least one number';
  }
  return '';
};

<Input
  label="Password"
  type="password"
  value={password}
  onChange={(e) => setPassword(e.target.value)}
  error={validatePassword(password)}
  description="Must be 8+ characters with at least one number"
/>;
```

### Auto-Generated ID

```tsx
{
  /* ID is auto-generated for label association */
}
<Input label="Auto ID Example" type="text" />;

{
  /* Custom ID */
}
<Input id="custom-id" label="Custom ID Example" type="text" />;
```

## Behavior

- Auto-generates unique ID if not provided
- Associates label with input via `htmlFor` and `id`
- Links description to input via `aria-describedby`
- Links error message to input via `aria-describedby` and sets `aria-invalid`
- Shows error message in red with "danger" tone
- Shows description in muted color

## Accessibility

- Label properly associated with input
- Error messages linked via `aria-describedby` and `aria-invalid`
- Description text linked via `aria-describedby`
- Uses semantic HTML (`<label>`, `<input>`)
- ID auto-generation prevents duplicate IDs
- Screen readers announce label, current value, description, and errors

## Do's and Don'ts

### Do

- Always provide a `label` for clarity
- Use `description` for helpful hints
- Show `error` messages clearly when validation fails
- Use appropriate input `type` for the data
- Keep labels concise and descriptive
- Use `required` attribute for required fields
- Clear error messages when input becomes valid

### Don't

- Don't use placeholder as the only label
- Don't show error messages before user interaction (unless form submitted)
- Don't use vague error messages ("Invalid input")
- Don't forget to handle both controlled and uncontrolled patterns
- Don't make error messages too long
- Don't rely solely on color to indicate errors

## Related Components

- [InputElement](../elements/InputElement.md) - Lower-level input component
- [TextArea](../elements/TextArea.md) - For multi-line input
- [Checkbox](../elements/Checkbox.md) - For boolean inputs
- [Select](../elements/Select.md) - For dropdown selections
- [Button](./Button.md) - For form submission

## References

- [Source](../../src/components/Input.tsx)
- [InputElement Source](../../src/elements/InputElement.tsx)
- [WCAG: Labels or Instructions](https://www.w3.org/WAI/WCAG21/Understanding/labels-or-instructions.html)
- [WCAG: Error Identification](https://www.w3.org/WAI/WCAG21/Understanding/error-identification.html)
