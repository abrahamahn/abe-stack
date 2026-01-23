// packages/ui/src/elements/Switch.tsx
import { useControllableState } from '@hooks/useControllableState';
import { forwardRef, type ComponentPropsWithoutRef } from 'react';

import '../styles/elements.css';

type SwitchProps = Omit<ComponentPropsWithoutRef<'button'>, 'onChange' | 'defaultChecked'> & {
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
      className={`switch ${className}`.trim()}
      data-checked={isChecked}
      onClick={() => {
        setChecked(!isChecked);
      }}
      {...rest}
    >
      <span className="switch-thumb" />
    </button>
  );
});

Switch.displayName = 'Switch';
