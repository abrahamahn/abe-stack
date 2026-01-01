# Switch

## Overview

An accessible toggle switch component for binary on/off states, implementing the ARIA switch pattern with support for both controlled and uncontrolled usage.

## Import

```tsx
import { Switch } from 'abeahn-ui/elements';
```

## Props

| Prop           | Type                                 | Default    | Description                                  |
| -------------- | ------------------------------------ | ---------- | -------------------------------------------- |
| checked        | `boolean`                            | -          | Controlled checked state                     |
| defaultChecked | `boolean`                            | `false`    | Initial checked state for uncontrolled usage |
| onChange       | `(checked: boolean) => void`         | -          | Callback when checked state changes          |
| type           | `'button' \| 'submit' \| 'reset'`    | `'button'` | Button type attribute                        |
| className      | `string`                             | `''`       | Additional CSS classes to apply              |
| ...rest        | `ComponentPropsWithoutRef<'button'>` | -          | All standard HTML `<button>` attributes      |
| ref            | `Ref<HTMLButtonElement>`             | -          | Forwarded ref to the `<button>` element      |

## Usage

### Uncontrolled (Default)

```tsx
<Switch />
```

### Controlled

```tsx
const [enabled, setEnabled] = useState(false);

<Switch checked={enabled} onChange={setEnabled} />;
```

### With Default State

```tsx
<Switch defaultChecked />
```

### With Label

```tsx
<div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
  <Switch checked={enabled} onChange={setEnabled} />
  <label onClick={() => setEnabled(!enabled)}>Enable notifications</label>
</div>
```

### Disabled State

```tsx
<Switch disabled />
<Switch disabled checked />
```

### Form Integration

```tsx
<form onSubmit={handleSubmit}>
  <div>
    <Switch
      name="darkMode"
      checked={settings.darkMode}
      onChange={(checked) => setSettings({ ...settings, darkMode: checked })}
    />
    <label>Dark mode</label>
  </div>
  <button type="submit">Save settings</button>
</form>
```

### Settings Panel Example

```tsx
const [settings, setSettings] = useState({
  notifications: true,
  darkMode: false,
  autoSave: true,
});

<div>
  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
    <span>Notifications</span>
    <Switch
      checked={settings.notifications}
      onChange={(checked) => setSettings({ ...settings, notifications: checked })}
    />
  </div>
  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
    <span>Dark Mode</span>
    <Switch
      checked={settings.darkMode}
      onChange={(checked) => setSettings({ ...settings, darkMode: checked })}
    />
  </div>
  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
    <span>Auto Save</span>
    <Switch
      checked={settings.autoSave}
      onChange={(checked) => setSettings({ ...settings, autoSave: checked })}
    />
  </div>
</div>;
```

### With Accessible Label

```tsx
<Switch checked={enabled} onChange={setEnabled} aria-label="Enable notifications" />
```

### With Described State

```tsx
<div>
  <Switch
    checked={enabled}
    onChange={setEnabled}
    aria-labelledby="switch-label"
    aria-describedby="switch-desc"
  />
  <span id="switch-label">Airplane mode</span>
  <span id="switch-desc">
    {enabled ? 'Wireless communication disabled' : 'Wireless communication enabled'}
  </span>
</div>
```

## Accessibility

- Implements `role="switch"` per ARIA specification
- Uses `aria-checked` to communicate state to screen readers
- Built on semantic `<button>` element for keyboard support
- Keyboard accessible (Space/Enter to toggle)
- Visual thumb indicator moves to show state
- Announces state changes to screen readers
- Supports disabled state
- Type defaults to "button" to prevent form submission

### Recommended Labeling Pattern

```tsx
<div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
  <Switch id="notifications-switch" checked={enabled} onChange={setEnabled} />
  <label htmlFor="notifications-switch">Enable push notifications</label>
</div>
```

## Do's and Don'ts

### Do

- Use for immediate on/off actions (e.g., enable/disable features)
- Pair with clear labels indicating what the switch controls
- Use controlled pattern when switch state affects other UI
- Provide visual feedback for state changes
- Consider using with associated descriptive text
- Use `aria-label` when visual label is not present

### Don't

- Don't use switch for actions that require confirmation
- Don't use for navigation or page changes
- Don't rely solely on color to indicate state
- Don't use switch when checkbox is more appropriate (e.g., form selections)
- Don't make switch labels too long
- Don't forget to provide accessible labels

## Switch vs Checkbox

Use **Switch** when:

- Action takes effect immediately
- Binary on/off or enabled/disabled state
- Settings and preferences
- Example: "Enable dark mode"

Use **Checkbox** when:

- Part of a form requiring submission
- Multiple selections in a group
- User needs to review before confirming
- Example: "I agree to terms and conditions"

## Related Components

- [Checkbox](./Checkbox.md) - For form selections
- [Radio](./Radio.md) - For mutually exclusive options
- [Button](../components/Button.md) - For general actions

## References

- [Source](../../src/elements/Switch.tsx)
- [Tests](../../src/elements/__tests__/Switch.test.tsx)
- [Hooks: useControllableState](../../src/hooks/useControllableState.ts)
- [ARIA: switch role](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Roles/switch_role)
- [ARIA Authoring Practices: Switch](https://www.w3.org/WAI/ARIA/apg/patterns/switch/)
