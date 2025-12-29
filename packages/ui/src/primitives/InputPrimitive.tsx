import { forwardRef, type ComponentPropsWithoutRef, type ElementType } from 'react';
import './primitives.css';

type InputProps = ComponentPropsWithoutRef<'input'> & {
  as?: ElementType;
};

export const InputPrimitive = forwardRef<HTMLElement, InputProps>((props, ref) => {
  const { as = 'input', className = '', ...rest } = props;
  const Component: ElementType = as;
  return <Component ref={ref} className={`ui-input ${className}`.trim()} {...rest} />;
});

InputPrimitive.displayName = 'InputPrimitive';
