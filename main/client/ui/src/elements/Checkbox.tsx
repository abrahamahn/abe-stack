// main/client/ui/src/elements/Checkbox.tsx
import { useControllableState } from '@hooks/useControllableState';
import { forwardRef, type ComponentPropsWithoutRef, type ReactNode } from 'react';

import '../styles/elements.css';

type CheckboxProps = Omit<ComponentPropsWithoutRef<'input'>, 'type' | 'onChange'> & {
  /** Controlled checked state */
  checked?: boolean;
  /** Initial checked state for uncontrolled usage */
  defaultChecked?: boolean;
  /** Callback when checked state changes */
  onChange?: (checked: boolean) => void;
  /** Label text or element to display next to checkbox */
  label?: ReactNode;
};

/**
 * An accessible checkbox component supporting both controlled and uncontrolled usage.
 *
 * @example
 * ```tsx
 * <Checkbox label="Accept terms" checked={agreed} onChange={setAgreed} />
 * ```
 */
export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>((props, ref) => {
  const { checked, defaultChecked, onChange, label, className = '', ...rest } = props;

  const [currentChecked, setChecked] = useControllableState<boolean>({
    ...(checked !== undefined && { value: checked }),
    defaultValue: defaultChecked ?? false,
    ...(onChange !== undefined && { onChange }),
  });

  const isChecked = currentChecked ?? false;

  return (
    <label className={`checkbox ${className}`.trim()}>
      <span className="checkbox-box" data-checked={isChecked}>
        {isChecked ? '✓' : ''}
      </span>
      <input
        ref={ref}
        type="checkbox"
        checked={isChecked}
        onChange={(event) => {
          setChecked(event.target.checked);
        }}
        onKeyDown={(event) => {
          if (event.key === ' ' || event.key === 'Enter') {
            event.preventDefault();
            setChecked(!isChecked);
          }
        }}
        className="checkbox-input"
        {...rest}
      />
      {label != null ? <span className="checkbox-label">{label}</span> : null}
    </label>
  );
});

Checkbox.displayName = 'Checkbox';
