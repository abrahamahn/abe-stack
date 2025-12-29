import { forwardRef, type ComponentPropsWithoutRef } from 'react';
import './primitives.css';

type DividerProps = ComponentPropsWithoutRef<'hr'>;

export const Divider = forwardRef<HTMLHRElement, DividerProps>((props, ref) => {
  const { className = '', ...rest } = props;
  return <hr ref={ref} className={`ui-divider ${className}`.trim()} {...rest} />;
});

Divider.displayName = 'Divider';
