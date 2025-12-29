import { forwardRef, type ComponentPropsWithoutRef } from 'react';
import './primitives.css';

type SwitchProps = ComponentPropsWithoutRef<'button'> & {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
};

export const Switch = forwardRef<HTMLButtonElement, SwitchProps>((props, ref) => {
  const { checked, onCheckedChange, className = '', type = 'button', ...rest } = props;
  return (
    <button
      ref={ref}
      type={type}
      role="switch"
      aria-checked={checked}
      className={`ui-switch ${className}`.trim()}
      data-checked={checked}
      onClick={() => {
        onCheckedChange(!checked);
      }}
      {...rest}
    >
      <span className="ui-switch-thumb" />
    </button>
  );
});

Switch.displayName = 'Switch';
