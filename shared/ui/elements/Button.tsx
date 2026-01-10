import { forwardRef, type ComponentPropsWithoutRef, type ElementType } from 'react';

import '../styles/components.css';

type ButtonProps = ComponentPropsWithoutRef<'button'> & {
  as?: ElementType;
  variant?: 'primary' | 'secondary' | 'text';
  size?: 'small' | 'medium' | 'large';
};

const Button = forwardRef<HTMLElement, ButtonProps>((props, ref) => {
  const {
    as = 'button',
    variant = 'primary',
    size = 'medium',
    className = '',
    type = 'button',
    ...rest
  } = props;
  const Component: ElementType = as;
  const buttonClass = `btn btn-${variant} btn-${size} ${className}`;

  return <Component ref={ref} type={type} className={buttonClass} {...rest} />;
});

Button.displayName = 'Button';

export { Button };
export type { ButtonProps };
