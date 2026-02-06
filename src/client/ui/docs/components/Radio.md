# Radio

## Overview

An accessible radio button component for mutually exclusive selections, supporting both controlled and uncontrolled patterns with built-in label support.

## Import

```tsx
import { Radio } from 'abeahn-ui/elements';
```

## Props

| Prop           | Type                                                            | Default | Description                                                         |
| -------------- | --------------------------------------------------------------- | ------- | ------------------------------------------------------------------- |
| name           | `string` (required)                                             | -       | Radio group name (all radios in a group must share the same name)   |
| checked        | `boolean`                                                       | -       | Controlled checked state                                            |
| defaultChecked | `boolean`                                                       | `false` | Initial checked state for uncontrolled usage                        |
| onChange       | `(checked: boolean) => void`                                    | -       | Callback when checked state changes                                 |
| label          | `ReactNode`                                                     | -       | Label text or element to display next to radio button               |
| className      | `string`                                                        | `''`    | Additional CSS classes to apply                                     |
| ...rest        | `Omit<ComponentPropsWithoutRef<'input'>, 'type' \| 'onChange'>` | -       | All standard HTML `<input>` attributes except `type` and `onChange` |
| ref            | `Ref<HTMLInputElement>`                                         | -       | Forwarded ref to the `<input>` element                              |

## Usage

### Basic Example (Controlled)

```tsx
const [value, setValue] = useState('option1');

<div>
  <Radio
    name="options"
    label="Option 1"
    checked={value === 'option1'}
    onChange={() => setValue('option1')}
  />
  <Radio
    name="options"
    label="Option 2"
    checked={value === 'option2'}
    onChange={() => setValue('option2')}
  />
  <Radio
    name="options"
    label="Option 3"
    checked={value === 'option3'}
    onChange={() => setValue('option3')}
  />
</div>;
```

### With Default Selection

```tsx
<div>
  <Radio name="plan" label="Free" defaultChecked />
  <Radio name="plan" label="Pro" />
  <Radio name="plan" label="Enterprise" />
</div>
```

### Without Labels

```tsx
<Radio name="choice" aria-label="Option A" />
<Radio name="choice" aria-label="Option B" />
```

### Disabled State

```tsx
<Radio name="options" label="Disabled option" disabled />
<Radio name="options" label="Disabled and selected" disabled checked />
```

### Form Integration

```tsx
<form onSubmit={handleSubmit}>
  <fieldset>
    <legend>Choose a plan:</legend>
    <Radio name="plan" value="free" label="Free" required />
    <Radio name="plan" value="pro" label="Pro" required />
    <Radio name="plan" value="enterprise" label="Enterprise" required />
  </fieldset>
  <button type="submit">Submit</button>
</form>
```

### Complete State Management Example

```tsx
const [paymentMethod, setPaymentMethod] = useState<'card' | 'paypal' | 'bank'>('card');

<div>
  <h3>Payment Method</h3>
  <Radio
    name="payment"
    label="Credit Card"
    checked={paymentMethod === 'card'}
    onChange={() => setPaymentMethod('card')}
  />
  <Radio
    name="payment"
    label="PayPal"
    checked={paymentMethod === 'paypal'}
    onChange={() => setPaymentMethod('paypal')}
  />
  <Radio
    name="payment"
    label="Bank Transfer"
    checked={paymentMethod === 'bank'}
    onChange={() => setPaymentMethod('bank')}
  />
</div>;
```

### With Value Attribute

```tsx
const [selectedValue, setSelectedValue] = useState('a');

<div>
  <Radio
    name="group"
    value="a"
    label="Option A"
    checked={selectedValue === 'a'}
    onChange={() => setSelectedValue('a')}
  />
  <Radio
    name="group"
    value="b"
    label="Option B"
    checked={selectedValue === 'b'}
    onChange={() => setSelectedValue('b')}
  />
</div>;
```

## Accessibility

- Built-in `<label>` wrapper for proper click target
- Native `<input type="radio">` for full screen reader support
- Custom visual radio circle with `role="radio"` and `aria-checked`
- Keyboard accessible (Tab to navigate, Space to select)
- Visual indicator (dot) shown when checked
- Supports all standard ARIA attributes via spread props
- Requires `name` prop to group related options

### Recommended Pattern with RadioGroup

For better keyboard navigation and ARIA support, use [RadioGroup](./RadioGroup.md):

```tsx
<RadioGroup name="options" aria-label="Choose an option">
  <Radio name="options" label="Option 1" />
  <Radio name="options" label="Option 2" />
  <Radio name="options" label="Option 3" />
</RadioGroup>
```

## Do's and Don'ts

### Do

- Always provide the same `name` for all radios in a group
- Use `label` prop for visible labels whenever possible
- Use controlled pattern for most cases
- Provide clear, mutually exclusive options
- Use [RadioGroup](./RadioGroup.md) for arrow key navigation
- Use `aria-label` when `label` prop is not provided

### Don't

- Don't use different `name` values for radios in the same group
- Don't use radio for non-exclusive selections (use Checkbox instead)
- Don't forget to provide accessible labels
- Don't allow no selection if one option is required (use `defaultChecked`)
- Don't nest radios within each other

## Related Components

- [RadioGroup](./RadioGroup.md) - Container for radio buttons with keyboard navigation
- [Checkbox](./Checkbox.md) - For non-exclusive selections
- [Switch](./Switch.md) - For binary toggle states

## References

- [Source](../../src/elements/Radio.tsx)
- [Tests](../../src/elements/__tests__/Radio.test.tsx)
- [Hooks: useControllableState](../../src/hooks/useControllableState.ts)
- [ARIA: radio role](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Roles/radio_role)
