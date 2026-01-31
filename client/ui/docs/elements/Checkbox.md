# Checkbox

## Overview

An accessible checkbox component supporting both controlled and uncontrolled usage patterns with built-in label support.

## Import

```tsx
import { Checkbox } from 'abeahn-ui/elements';
```

## Props

| Prop           | Type                                                            | Default | Description                                                         |
| -------------- | --------------------------------------------------------------- | ------- | ------------------------------------------------------------------- |
| checked        | `boolean`                                                       | -       | Controlled checked state                                            |
| defaultChecked | `boolean`                                                       | `false` | Initial checked state for uncontrolled usage                        |
| onChange       | `(checked: boolean) => void`                                    | -       | Callback when checked state changes                                 |
| label          | `ReactNode`                                                     | -       | Label text or element to display next to checkbox                   |
| className      | `string`                                                        | `''`    | Additional CSS classes to apply                                     |
| ...rest        | `Omit<ComponentPropsWithoutRef<'input'>, 'type' \| 'onChange'>` | -       | All standard HTML `<input>` attributes except `type` and `onChange` |
| ref            | `Ref<HTMLInputElement>`                                         | -       | Forwarded ref to the `<input>` element                              |

## Usage

### Uncontrolled (Default)

```tsx
<Checkbox label="Accept terms and conditions" />
```

### Controlled

```tsx
const [checked, setChecked] = useState(false);

<Checkbox checked={checked} onChange={setChecked} label="Subscribe to newsletter" />;
```

### With Default Checked State

```tsx
<Checkbox defaultChecked label="Remember me" />
```

### Without Label

```tsx
<Checkbox aria-label="Select item" />
```

### Disabled State

```tsx
<Checkbox label="Disabled option" disabled />
<Checkbox label="Disabled and checked" disabled checked />
```

### Form Integration

```tsx
<form onSubmit={handleSubmit}>
  <Checkbox name="terms" label="I agree to the terms and conditions" required />
  <button type="submit">Submit</button>
</form>
```

### Multiple Checkboxes

```tsx
const [preferences, setPreferences] = useState({
  email: false,
  sms: false,
  push: false,
});

<div>
  <Checkbox
    checked={preferences.email}
    onChange={(checked) => setPreferences((prev) => ({ ...prev, email: checked }))}
    label="Email notifications"
  />
  <Checkbox
    checked={preferences.sms}
    onChange={(checked) => setPreferences((prev) => ({ ...prev, sms: checked }))}
    label="SMS notifications"
  />
  <Checkbox
    checked={preferences.push}
    onChange={(checked) => setPreferences((prev) => ({ ...prev, push: checked }))}
    label="Push notifications"
  />
</div>;
```

### Indeterminate State Pattern

```tsx
const [items, setItems] = useState([
  { id: 1, checked: false },
  { id: 2, checked: true },
  { id: 3, checked: false },
]);

const allChecked = items.every((item) => item.checked);
const someChecked = items.some((item) => item.checked) && !allChecked;

<div>
  <Checkbox
    checked={allChecked}
    onChange={(checked) => {
      setItems(items.map((item) => ({ ...item, checked })));
    }}
    label="Select all"
  />
  {items.map((item) => (
    <Checkbox
      key={item.id}
      checked={item.checked}
      onChange={(checked) => {
        setItems(items.map((i) => (i.id === item.id ? { ...i, checked } : i)));
      }}
      label={`Item ${item.id}`}
    />
  ))}
</div>;
```

## Accessibility

- Built-in `<label>` wrapper for proper click target
- Native `<input type="checkbox">` for full screen reader support
- Keyboard accessible (Space/Enter keys toggle state)
- Custom visual checkbox synchronized with native input
- Checkmark icon (✓) shown when checked
- Supports all standard ARIA attributes via spread props

### With ARIA Attributes

```tsx
<Checkbox
  label="Marketing emails"
  aria-describedby="marketing-help"
/>
<span id="marketing-help">
  Receive promotional emails about new products
</span>
```

## Do's and Don'ts

### Do

- Use `label` prop for visible labels whenever possible
- Use controlled pattern when checkbox state affects other UI
- Provide clear, descriptive labels
- Group related checkboxes logically
- Use `aria-label` when `label` prop is not provided
- Support both controlled and uncontrolled patterns

### Don't

- Don't rely solely on visual styling for states
- Don't use checkbox for mutually exclusive options (use Radio instead)
- Don't forget to provide accessible labels
- Don't nest checkboxes within each other
- Don't make checkbox labels too long (keep concise)

## Related Components

- [Radio](./Radio.md) - For mutually exclusive options
- [RadioGroup](./RadioGroup.md) - For grouped radio buttons
- [Switch](./Switch.md) - For toggle switches

## References

- [Source](../../src/elements/Checkbox.tsx)
- [Tests](../../src/elements/__tests__/Checkbox.test.tsx)
- [Hooks: useControllableState](../../src/hooks/useControllableState.ts)
- [ARIA: checkbox role](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Roles/checkbox_role)
