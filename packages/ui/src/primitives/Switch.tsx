import { forwardRef, type ComponentPropsWithoutRef } from 'react';

import { useControllableState } from '../hooks/useControllableState';
import './primitives.css';

type SwitchProps = ComponentPropsWithoutRef<'button'> & {
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (checked: boolean) => void;
};

export const Switch = forwardRef<HTMLButtonElement, SwitchProps>((props, ref) => {
  const { checked, defaultChecked, onChange, className = '', type = 'button', ...rest } = props;

  const [currentChecked, setChecked] = useControllableState<boolean>({
    value: checked,
    defaultValue: defaultChecked ?? false,
    onChange,
  });

  const isChecked = currentChecked ?? false;

  return (
    <button
      ref={ref}
      type={type}
      role="switch"
      aria-checked={isChecked}
      className={`ui-switch ${className}`.trim()}
      data-checked={isChecked}
      onClick={() => {
        setChecked(!isChecked);
      }}
      {...rest}
    >
      <span className="ui-switch-thumb" />
    </button>
  );
});

Switch.displayName = 'Switch';
