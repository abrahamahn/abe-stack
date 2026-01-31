# FormField

## Overview

A form field wrapper component that provides consistent layout for form inputs with label, error message, and helper text support. Handles accessibility attributes automatically.

## Import

```tsx
import { FormField } from '@abe-stack/ui';
```

## Props

| Prop       | Type        | Default | Description                              |
| ---------- | ----------- | ------- | ---------------------------------------- |
| label      | `string`    | -       | Label text for the form field (required) |
| htmlFor    | `string`    | -       | ID of the input element (required)       |
| error      | `string`    | -       | Error message to display                 |
| description | `string`    | -       | Helper text shown below input            |
| required   | `boolean`   | `false` | Shows required indicator (\*)            |
| children   | `ReactNode` | -       | The form input element(s)                |
| className  | `string`    | `''`    | Additional CSS classes                   |

## Usage

### Basic Example

```tsx
<FormField label="Email" htmlFor="email">
  <Input id="email" type="email" />
</FormField>
```

### Required Field

```tsx
<FormField label="Username" htmlFor="username" required>
  <Input id="username" />
</FormField>
```

### With Error Message

```tsx
<FormField label="Password" htmlFor="password" error="Password must be at least 8 characters">
  <Input id="password" type="password" />
</FormField>
```

### With Helper Text

```tsx
<FormField label="Bio" htmlFor="bio" description="Max 500 characters">
  <TextArea id="bio" />
</FormField>
```

### Complete Form Example

```tsx
<form>
  <FormField label="Email" htmlFor="email" required>
    <Input id="email" type="email" />
  </FormField>

  <FormField
    label="Password"
    htmlFor="password"
    required
    error={errors.password}
    description="At least 8 characters"
  >
    <Input id="password" type="password" />
  </FormField>

  <Button type="submit">Submit</Button>
</form>
```

## Accessibility

- Label is properly associated with input via `htmlFor`
- Error messages use `role="alert"` for screen reader announcements
- Required fields display visual indicator (\*)
- Helper text provides additional context

## Do's and Don'ts

### Do

- Always provide matching `htmlFor` and input `id`
- Use clear, descriptive labels
- Provide helpful error messages that explain how to fix issues
- Use helper text for format hints or constraints

### Don't

- Use placeholder text as a replacement for labels
- Show both error and helper text simultaneously (error takes precedence)
- Forget to mark required fields
- Use generic error messages like "Invalid input"

## Related Components

- [Input](../components/Input.md) - Text input component
- [TextArea](../elements/TextArea.md) - Multi-line text input

## References

- [Source Code](../../src/compounds/FormField.tsx)
- [Tests](../../src/compounds/__tests__/FormField.test.tsx)
