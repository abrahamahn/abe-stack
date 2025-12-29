import { forwardRef, type ComponentPropsWithoutRef } from 'react';
import './primitives.css';

type InputProps = ComponentPropsWithoutRef<'input'>;

export const InputPrimitive = forwardRef<HTMLInputElement, InputProps>((props, ref) => {
  const { className = '', ...rest } = props;
  return <input ref={ref} className={`ui-input ${className}`.trim()} {...rest} />;
});

InputPrimitive.displayName = 'InputPrimitive';
