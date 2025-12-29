import { forwardRef, type ComponentPropsWithoutRef } from 'react';

import { useControllableState } from '../hooks/useControllableState';
import './primitives.css';

type RadioProps = Omit<ComponentPropsWithoutRef<'input'>, 'type' | 'onChange'> & {
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (checked: boolean) => void;
  label?: React.ReactNode;
  name: string;
};

export const Radio = forwardRef<HTMLInputElement, RadioProps>((props, ref) => {
  const { checked, defaultChecked, onChange, label, className = '', name, ...rest } = props;

  const [currentChecked, setChecked] = useControllableState<boolean>({
    value: checked,
    defaultValue: defaultChecked ?? false,
    onChange,
  });

  const isChecked = currentChecked ?? false;

  return (
    <label className={`ui-radio ${className}`.trim()}>
      <span
        className="ui-radio-circle"
        data-checked={isChecked}
        aria-checked={isChecked}
        role="radio"
      >
        {isChecked ? <span className="ui-radio-dot" /> : null}
      </span>
      <input
        ref={ref}
        type="radio"
        name={name}
        checked={isChecked}
        onChange={() => {
          setChecked(true);
        }}
        className="ui-radio-input"
        {...rest}
      />
      {label ? <span>{label}</span> : null}
    </label>
  );
});

Radio.displayName = 'Radio';
