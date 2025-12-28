import { forwardRef } from 'react';
import type { ComponentPropsWithoutRef } from 'react';
import './button.css';

interface ButtonProps extends ComponentPropsWithoutRef<'button'> {
  variant?: 'primary' | 'secondary' | 'text';
  size?: 'small' | 'medium' | 'large';
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>((props, ref) => {
  const { variant = 'primary', size = 'medium', className = '', ...rest } = props;
  const buttonClass = `btn btn-${variant} btn-${size} ${className}`;

  return <button ref={ref} className={buttonClass} {...rest} />;
});

Button.displayName = 'Button';

export { Button };
export default Button;
