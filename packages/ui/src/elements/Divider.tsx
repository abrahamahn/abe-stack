// packages/ui/src/elements/Divider.tsx
import { forwardRef, type ComponentPropsWithoutRef } from 'react';
import '../styles/elements.css';

type DividerProps = ComponentPropsWithoutRef<'hr'>;

/**
 * A horizontal rule to visually separate content sections.
 *
 * @example
 * ```tsx
 * <Divider />
 * ```
 */
export const Divider = forwardRef<HTMLHRElement, DividerProps>((props, ref) => {
  const { className = '', ...rest } = props;
  return <hr ref={ref} className={`divider ${className}`.trim()} {...rest} />;
});

Divider.displayName = 'Divider';
