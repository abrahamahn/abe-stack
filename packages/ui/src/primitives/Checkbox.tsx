import { forwardRef, type ComponentPropsWithoutRef } from 'react';

import { useControllableState } from '../hooks/useControllableState';

import type React from 'react';

import './primitives.css';

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
    <label className={`ui-checkbox ${className}`.trim()}>
      <span className="ui-checkbox-box" data-checked={isChecked}>
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
        className="ui-checkbox-input"
        {...rest}
      />
      {label ? <span>{label}</span> : null}
    </label>
  );
});

Checkbox.displayName = 'Checkbox';
