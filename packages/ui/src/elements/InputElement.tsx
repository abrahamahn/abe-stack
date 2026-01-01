import { forwardRef, type ComponentPropsWithoutRef, type ElementType } from 'react';
import '../styles/elements.css';

type InputProps = ComponentPropsWithoutRef<'input'> & {
  as?: ElementType;
};

export const InputElement = forwardRef<HTMLElement, InputProps>((props, ref) => {
  const { as = 'input', className = '', ...rest } = props;
  const Component: ElementType = as;
  return <Component ref={ref} className={`ui-input ${className}`.trim()} {...rest} />;
});

InputElement.displayName = 'InputElement';
