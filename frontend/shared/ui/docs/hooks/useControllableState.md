# useControllableState

## Overview

Manages state that can be either controlled (value passed as prop) or uncontrolled (internal state). Essential for building flexible form components.

## Import

```tsx
import { useControllableState } from '@abe-stack/ui';
```

## Signature

```tsx
function useControllableState<T>({
  value,
  defaultValue,
  onChange,
}: UseControllableStateProps<T>): [T | undefined, (next: T) => void];
```

## Parameters

| Parameter    | Type                 | Description                         |
| ------------ | -------------------- | ----------------------------------- |
| value        | `T \| undefined`     | Controlled value (optional)         |
| defaultValue | `T \| undefined`     | Default value for uncontrolled mode |
| onChange     | `(value: T) => void` | Callback when value changes         |

## Returns

| Index | Type                | Description              |
| ----- | ------------------- | ------------------------ |
| 0     | `T \| undefined`    | Current value            |
| 1     | `(next: T) => void` | Function to update value |

## Usage

### Building a Toggle Component

```tsx
function Toggle({ checked, defaultChecked, onChange }) {
  const [isChecked, setIsChecked] = useControllableState({
    value: checked,
    defaultValue: defaultChecked ?? false,
    onChange,
  });

  return (
    <button onClick={() => setIsChecked(!isChecked)}>
      {isChecked ? 'On' : 'Off'}
    </button>
  );
}

// Uncontrolled usage
<Toggle defaultChecked={false} />

// Controlled usage
<Toggle checked={value} onChange={setValue} />
```

### With Select Component

```tsx
function Select({ value, defaultValue, onChange, options }) {
  const [selected, setSelected] = useControllableState({
    value,
    defaultValue,
    onChange,
  });

  return (
    <select value={selected} onChange={(e) => setSelected(e.target.value)}>
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
```

## Behavior

- When `value` is provided, component is controlled
- When `value` is undefined, uses internal state
- `onChange` is called in both modes

## Do's and Don'ts

### Do

- Use when building reusable form components
- Support both controlled and uncontrolled patterns
- Always call onChange even in uncontrolled mode

### Don't

- Mix controlled and uncontrolled modes at runtime
- Forget to provide defaultValue for uncontrolled usage
- Ignore TypeScript generics for type safety

## References

- [Source Code](../../src/hooks/useControllableState.ts)
