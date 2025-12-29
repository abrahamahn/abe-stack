import { forwardRef, type ComponentPropsWithoutRef } from 'react';
import './primitives.css';

type RadioProps = Omit<ComponentPropsWithoutRef<'input'>, 'type' | 'onChange'> & {
  checked: boolean;
  onCheckedChange: () => void;
  label?: React.ReactNode;
  name: string;
};

export const Radio = forwardRef<HTMLInputElement, RadioProps>((props, ref) => {
  const { checked, onCheckedChange, label, className = '', name, ...rest } = props;

  return (
    <label className={`ui-radio ${className}`.trim()}>
      <span className="ui-radio-circle" data-checked={checked}>
        {checked ? <span className="ui-radio-dot" /> : null}
      </span>
      <input
        ref={ref}
        type="radio"
        name={name}
        checked={checked}
        onChange={onCheckedChange}
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

Radio.displayName = 'Radio';
