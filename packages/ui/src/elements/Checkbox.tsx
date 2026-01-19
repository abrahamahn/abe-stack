// packages/ui/src/elements/Checkbox.tsx
import { useControllableState } from '@hooks/useControllableState';
import { forwardRef, type ComponentPropsWithoutRef } from 'react';

import type React from 'react';

import '../styles/elements.css';

type CheckboxProps = Omit<ComponentPropsWithoutRef<'input'>, 'type' | 'onChange'> & {
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (checked: boolean) => void;
  label?: React.ReactNode;
};

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>((props, ref) => {
  const { checked, defaultChecked, onChange, label, className = '', ...rest } = props;

  const [currentChecked, setChecked] = useControllableState<boolean>({
    value: checked,
    defaultValue: defaultChecked ?? false,
    onChange,
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
        onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
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
      {label ? <span className="checkbox-label">{label}</span> : null}
    </label>
  );
});

Checkbox.displayName = 'Checkbox';
