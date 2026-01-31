// client/ui/src/elements/VisuallyHidden.tsx
import { forwardRef, type ComponentPropsWithoutRef } from 'react';
import '../styles/elements.css';

type VisuallyHiddenProps = ComponentPropsWithoutRef<'span'>;

/**
 * Hides content visually while keeping it accessible to screen readers.
 *
 * @example
 * ```tsx
 * <button>
 *   <IconClose />
 *   <VisuallyHidden>Close dialog</VisuallyHidden>
 * </button>
 * ```
 */
export const VisuallyHidden = forwardRef<HTMLSpanElement, VisuallyHiddenProps>((props, ref) => {
  const { className = '', ...rest } = props;
  return <span ref={ref} className={`visually-hidden ${className}`.trim()} {...rest} />;
});

VisuallyHidden.displayName = 'VisuallyHidden';
