// packages/ui/src/elements/Kbd.tsx
import { forwardRef, type ComponentPropsWithoutRef } from 'react';
import '../styles/elements.css';

type KbdProps = ComponentPropsWithoutRef<'kbd'> & {
  /**
   * Size variant for the keyboard key display
   * @default 'md'
   */
  size?: 'sm' | 'md';
};

/**
 * Keyboard key display component for showing keyboard shortcuts
 *
 * @example
 * ```tsx
 * <Kbd>Ctrl</Kbd>
 * <Kbd size="sm">K</Kbd>
 * ```
 */
export const Kbd = forwardRef<HTMLElement, KbdProps>((props, ref) => {
  const { size = 'md', className = '', children, ...rest } = props;

  return (
    <kbd ref={ref} className={`kbd ${className}`.trim()} data-size={size} {...rest}>
      {children}
    </kbd>
  );
});

Kbd.displayName = 'Kbd';
