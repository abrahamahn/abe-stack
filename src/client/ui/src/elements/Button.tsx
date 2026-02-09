// src/client/ui/src/elements/Button.tsx
import { forwardRef, type ComponentPropsWithoutRef, type ElementType } from 'react';

import '../styles/elements.css';

type ButtonProps = ComponentPropsWithoutRef<'button'> & {
  /** The HTML element or React component to render as */
  as?: ElementType;
  /** Visual style variant */
  variant?: 'primary' | 'secondary' | 'text';
  /** Button size */
  size?: 'small' | 'medium' | 'large';
};

/**
 * A polymorphic button component with multiple variants and sizes.
 *
 * @example
 * ```tsx
 * <Button variant="primary" onClick={handleClick}>
 *   Click me
 * </Button>
 * ```
 */
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
