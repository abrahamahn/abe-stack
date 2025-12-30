# Select

## Overview

An accessible custom select/dropdown component with keyboard navigation, built from native `<option>` children for a familiar API.

## Import

```tsx
import { Select } from 'abeahn-ui/primitives';
```

## Props

| Prop         | Type                                                                  | Default              | Description                                   |
| ------------ | --------------------------------------------------------------------- | -------------------- | --------------------------------------------- |
| value        | `string`                                                              | -                    | Controlled selected value                     |
| defaultValue | `string`                                                              | First option's value | Initial selected value for uncontrolled usage |
| onChange     | `(value: string) => void`                                             | -                    | Callback when selection changes               |
| children     | `ReactNode` (required)                                                | -                    | `<option>` elements                           |
| name         | `string`                                                              | -                    | Form field name                               |
| disabled     | `boolean`                                                             | -                    | Disable the select                            |
| className    | `string`                                                              | `''`                 | Additional CSS classes                        |
| ...rest      | `Omit<ComponentPropsWithoutRef<'button'>, 'value' \| 'defaultValue'>` | -                    | Button attributes                             |
| ref          | `Ref<HTMLDivElement>`                                                 | -                    | Forwarded ref to container                    |

## Usage

### Basic Example

```tsx
<Select>
  <option value="apple">Apple</option>
  <option value="banana">Banana</option>
  <option value="orange">Orange</option>
</Select>
```

### Controlled

```tsx
const [fruit, setFruit] = useState('apple');

<Select value={fruit} onChange={setFruit}>
  <option value="apple">Apple</option>
  <option value="banana">Banana</option>
  <option value="orange">Orange</option>
</Select>;
```

### With Default Value

```tsx
<Select defaultValue="banana">
  <option value="apple">Apple</option>
  <option value="banana">Banana</option>
  <option value="orange">Orange</option>
</Select>
```

### Form Integration

```tsx
<form onSubmit={handleSubmit}>
  <label htmlFor="country">Country:</label>
  <Select name="country" defaultValue="us">
    <option value="us">United States</option>
    <option value="uk">United Kingdom</option>
    <option value="ca">Canada</option>
  </Select>
  <button type="submit">Submit</button>
</form>
```

### Dynamic Options

```tsx
const countries = [
  { code: 'us', name: 'United States' },
  { code: 'uk', name: 'United Kingdom' },
  { code: 'ca', name: 'Canada' },
];

<Select>
  {countries.map((country) => (
    <option key={country.code} value={country.code}>
      {country.name}
    </option>
  ))}
</Select>;
```

### Disabled State

```tsx
<Select disabled>
  <option value="1">Option 1</option>
  <option value="2">Option 2</option>
</Select>
```

## Keyboard Navigation

| Key               | Action                                       |
| ----------------- | -------------------------------------------- |
| **ArrowDown**     | Open menu (if closed) or move to next option |
| **ArrowUp**       | Move to previous option (when open)          |
| **Enter / Space** | Open menu or select highlighted option       |
| **Escape**        | Close menu                                   |
| **Tab**           | Close menu and move focus                    |
| **Home**          | Jump to first option (when open)             |
| **End**           | Jump to last option (when open)              |

## Accessibility

- Implements ARIA listbox pattern
- Uses `role="listbox"` for dropdown menu
- Uses `role="option"` for each option
- Button has `aria-haspopup="listbox"` and `aria-expanded`
- Each option has `aria-selected` state
- Keyboard navigation follows ARIA best practices
- Highlighted option tracked for visual and ARIA feedback

## Do's and Don'ts

### Do

- Use `<option>` elements as children for familiar API
- Provide `value` attribute on options
- Use controlled pattern when selection affects other UI
- Keep option labels concise
- Use for 5-15 options (use autocomplete/combobox for more)

### Don't

- Don't use for very few options (2-3, use Radio instead)
- Don't use for many options (>20, use autocomplete)
- Don't put complex content in options (text only)
- Don't forget to handle form submission
- Don't override keyboard navigation

## Related Components

- [Radio](./Radio.md) - For few mutually exclusive options
- [Dropdown](./Dropdown.md) - For action menus
- [Input](../components/Input.md) - For text input

## References

- [Source](../../src/primitives/Select.tsx)
- [Tests](../../src/primitives/__tests__/Select.test.tsx)
- [Hooks: useDisclosure](../../src/hooks/useDisclosure.ts)
- [ARIA: Listbox Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/listbox/)
