// packages/ui/src/components/Radio.tsx
import { useRadioGroupContext } from '@components/RadioGroup';
import { useControllableState } from '@hooks/useControllableState';
import { forwardRef, type ComponentPropsWithoutRef } from 'react';

import '../styles/components.css';

type RadioProps = Omit<ComponentPropsWithoutRef<'input'>, 'type' | 'onChange' | 'name'> & {
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (checked: boolean) => void;
  label?: React.ReactNode;
  name?: string;
  value?: string | number | readonly string[];
};

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
    value: checkedProp,
    defaultValue: defaultChecked ?? false,
    onChange,
  });

  const isGrouped = !!groupContext;
  let isChecked = internalChecked ?? false;
  let name = nameProp;

  if (isGrouped) {
    if (value !== undefined) {
      isChecked = groupContext.value === String(value);
    }
    // If name is not provided on Radio, use group name
    name = nameProp || groupContext.name;
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
      {label ? <span>{label}</span> : null}
    </label>
  );
});

Radio.displayName = 'Radio';
