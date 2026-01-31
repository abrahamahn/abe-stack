// shared/ui/src/components/Radio.tsx
import { useRadioGroupContext } from '@components/RadioGroup';
import { useControllableState } from '@hooks/useControllableState';
import { forwardRef, type ComponentPropsWithoutRef } from 'react';

import '../styles/components.css';

type RadioProps = Omit<ComponentPropsWithoutRef<'input'>, 'type' | 'onChange' | 'name'> & {
  /** Controlled checked state */
  checked?: boolean;
  /** Initial checked state for uncontrolled usage */
  defaultChecked?: boolean;
  /** Callback when checked state changes */
  onChange?: (checked: boolean) => void;
  /** Label text or element */
  label?: React.ReactNode;
  /** Radio group name */
  name?: string;
  /** Value for the radio option */
  value?: string | number | readonly string[];
};

/**
 * An accessible radio button for mutually exclusive options.
 *
 * @example
 * ```tsx
 * <Radio label="Option A" name="choice" value="a" />
 * ```
 */
export const Radio = forwardRef<HTMLInputElement, RadioProps>((props, ref) => {
  const {
    checked: checkedProp,
    defaultChecked,
    onChange,
    label,
    className = '',
    name: nameProp,
    value,
    ...rest
  } = props;
  const groupContext = useRadioGroupContext();

  const [internalChecked, setInternalChecked] = useControllableState<boolean>({
    ...(checkedProp !== undefined && { value: checkedProp }),
    defaultValue: defaultChecked ?? false,
    ...(onChange !== undefined && { onChange }),
  });

  const isGrouped = groupContext != null;
  let isChecked = internalChecked ?? false;
  let name = nameProp;

  if (isGrouped) {
    if (value !== undefined) {
      isChecked = groupContext.value === String(value);
    }
    // If name is not provided on Radio, use group name
     name = (nameProp != null && nameProp !== '') ? nameProp : groupContext.name;
   }

  const handleChange = (): void => {
    if (isGrouped) {
      if (value !== undefined) {
        groupContext.onValueChange(String(value));
      }
      onChange?.(true);
    } else {
      setInternalChecked(true);
    }
  };

  return (
    <label className={`radio ${className}`.trim()}>
      <span className="radio-circle" data-checked={isChecked} aria-hidden="true">
        {isChecked ? <span className="radio-dot" /> : null}
      </span>
      <input
        ref={ref}
        type="radio"
        name={name}
        value={value}
        checked={isChecked}
        onChange={handleChange}
        className="radio-input"
        {...rest}
      />
      {label != null ? <span>{label}</span> : null}
    </label>
  );
});

Radio.displayName = 'Radio';
