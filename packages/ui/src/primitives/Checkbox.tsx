import { forwardRef, type ComponentPropsWithoutRef } from 'react';

import type React from 'react';
import './primitives.css';

type CheckboxProps = Omit<ComponentPropsWithoutRef<'input'>, 'type' | 'onChange'> & {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label?: React.ReactNode;
};

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>((props, ref) => {
  const { checked, onCheckedChange, label, className = '', ...rest } = props;

  return (
    <label className={`ui-checkbox ${className}`.trim()}>
      <span className="ui-checkbox-box" data-checked={checked}>
        {checked ? '✓' : ''}
      </span>
      <input
        ref={ref}
        type="checkbox"
        checked={checked}
        onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
          onCheckedChange(event.target.checked);
        }}
        style={{
          position: 'absolute',
          opacity: 0,
          pointerEvents: 'none',
          width: 1,
          height: 1,
        }}
        {...rest}
      />
      {label ? <span>{label}</span> : null}
    </label>
  );
});

Checkbox.displayName = 'Checkbox';
