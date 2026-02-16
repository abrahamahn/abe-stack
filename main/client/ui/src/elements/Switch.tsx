// main/client/ui/src/elements/Switch.tsx
import { useControllableState } from '@hooks/useControllableState';
import { forwardRef, type ComponentPropsWithoutRef } from 'react';

import { Button } from './Button';

import '../styles/elements.css';

type SwitchProps = Omit<ComponentPropsWithoutRef<'button'>, 'onChange' | 'defaultChecked'> & {
  /** Controlled checked state */
  checked?: boolean;
  /** Initial checked state for uncontrolled usage */
  defaultChecked?: boolean;
  /** Callback when checked state changes */
  onChange?: (checked: boolean) => void;
};

/**
 * An accessible toggle switch for binary on/off states.
 *
 * @example
 * ```tsx
 * <Switch checked={enabled} onChange={setEnabled} />
 * ```
 */
export const Switch = forwardRef<HTMLButtonElement, SwitchProps>((props, ref) => {
  const { checked, defaultChecked, onChange, className = '', type = 'button', ...rest } = props;

  const [currentChecked, setChecked] = useControllableState<boolean>({
    ...(checked !== undefined && { value: checked }),
    defaultValue: defaultChecked ?? false,
    ...(onChange !== undefined && { onChange }),
  });

  const isChecked = currentChecked ?? false;

  return (
    <Button
      ref={ref as any}
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
    </Button>
  );
});

Switch.displayName = 'Switch';
