# RadioGroup

## Overview

A container component for radio buttons that provides keyboard navigation (arrow keys, Home, End) and proper ARIA radiogroup semantics.

## Import

```tsx
import { RadioGroup } from 'abeahn-ui/elements';
import { Radio } from 'abeahn-ui/elements';
```

## Props

| Prop            | Type                      | Default | Description                                       |
| --------------- | ------------------------- | ------- | ------------------------------------------------- |
| name            | `string` (required)       | -       | Name for the radio group (passed to child radios) |
| value           | `string`                  | -       | Controlled selected value                         |
| defaultValue    | `string`                  | -       | Initial selected value for uncontrolled usage     |
| onValueChange   | `(value: string) => void` | -       | Callback when selection changes                   |
| children        | `ReactNode` (required)    | -       | Radio button children                             |
| className       | `string`                  | `''`    | Additional CSS classes to apply                   |
| aria-label      | `string`                  | -       | Accessible label for the radio group              |
| aria-labelledby | `string`                  | -       | ID of element labeling the radio group            |

## Usage

### Basic Example

```tsx
<RadioGroup name="options" aria-label="Choose an option">
  <Radio name="options" label="Option 1" />
  <Radio name="options" label="Option 2" />
  <Radio name="options" label="Option 3" />
</RadioGroup>
```

### Controlled with State

```tsx
const [value, setValue] = useState('option1');

<RadioGroup name="plan" value={value} onValueChange={setValue} aria-label="Select a plan">
  <Radio name="plan" value="free" label="Free" checked={value === 'free'} />
  <Radio name="plan" value="pro" label="Pro" checked={value === 'pro'} />
  <Radio name="plan" value="enterprise" label="Enterprise" checked={value === 'enterprise'} />
</RadioGroup>;
```

### With Default Value

```tsx
<RadioGroup name="theme" defaultValue="light" aria-label="Choose theme">
  <Radio name="theme" value="light" label="Light" />
  <Radio name="theme" value="dark" label="Dark" />
  <Radio name="theme" value="auto" label="Auto" />
</RadioGroup>
```

### With External Label

```tsx
<div>
  <h3 id="payment-label">Payment Method</h3>
  <RadioGroup name="payment" aria-labelledby="payment-label">
    <Radio name="payment" label="Credit Card" />
    <Radio name="payment" label="PayPal" />
    <Radio name="payment" label="Bank Transfer" />
  </RadioGroup>
</div>
```

### Form Example

```tsx
<form onSubmit={handleSubmit}>
  <RadioGroup name="size" aria-label="T-shirt size">
    <Radio name="size" value="s" label="Small" />
    <Radio name="size" value="m" label="Medium" defaultChecked />
    <Radio name="size" value="l" label="Large" />
    <Radio name="size" value="xl" label="Extra Large" />
  </RadioGroup>
  <button type="submit">Add to cart</button>
</form>
```

### Custom Styling

```tsx
<RadioGroup
  name="priority"
  aria-label="Task priority"
  className="priority-group"
  style={{ display: 'flex', gap: '12px' }}
>
  <Radio name="priority" label="Low" />
  <Radio name="priority" label="Medium" />
  <Radio name="priority" label="High" />
</RadioGroup>
```

## Keyboard Navigation

RadioGroup provides full keyboard navigation:

| Key                        | Action                                       |
| -------------------------- | -------------------------------------------- |
| **ArrowDown / ArrowRight** | Select next radio button (wraps to first)    |
| **ArrowUp / ArrowLeft**    | Select previous radio button (wraps to last) |
| **Home**                   | Select first radio button                    |
| **End**                    | Select last radio button                     |
| **Tab**                    | Move focus out of radio group                |
| **Shift + Tab**            | Move focus into/out of radio group           |

## Accessibility

- Uses `role="radiogroup"` for proper semantic structure
- Supports `aria-label` or `aria-labelledby` for accessible labeling
- Implements full keyboard navigation per ARIA authoring practices
- Arrow keys cycle through options and select them
- Home/End keys jump to first/last option
- Each radio maintains its own focus and selection state
- Screen readers announce group context and current selection

### Always Provide a Label

```tsx
{
  /* Option 1: aria-label */
}
<RadioGroup name="options" aria-label="Choose an option">
  ...
</RadioGroup>;

{
  /* Option 2: aria-labelledby */
}
<div>
  <h3 id="group-label">Choose an option</h3>
  <RadioGroup name="options" aria-labelledby="group-label">
    ...
  </RadioGroup>
</div>;
```

## Do's and Don'ts

### Do

- Always provide `aria-label` or `aria-labelledby`
- Use consistent `name` across all child Radio components
- Group logically related options together
- Provide clear, mutually exclusive labels
- Test keyboard navigation
- Use controlled pattern when selection affects other UI

### Don't

- Don't forget to label the radio group
- Don't mix different radio groups in the same RadioGroup
- Don't disable keyboard navigation
- Don't use for non-exclusive choices (use Checkbox instead)
- Don't have too many options (>7-8) without grouping or search

## Related Components

- [Radio](./Radio.md) - Individual radio button component
- [Checkbox](./Checkbox.md) - For non-exclusive selections
- [Select](./Select.md) - For dropdown selection of many options

## References

- [Source](../../src/elements/RadioGroup.tsx)
- [Tests](../../src/elements/__tests__/RadioGroup.test.tsx)
- [ARIA: radiogroup role](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Roles/radiogroup_role)
- [ARIA Authoring Practices: Radio Group](https://www.w3.org/WAI/ARIA/apg/patterns/radio/)
