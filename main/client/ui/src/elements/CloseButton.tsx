// main/client/ui/src/elements/CloseButton.tsx
import { forwardRef, type ComponentPropsWithoutRef } from 'react';

import { Button } from './Button';

import '../styles/elements.css';

type CloseButtonProps = ComponentPropsWithoutRef<'button'> & {
  /** Additional CSS class names */
  className?: string;
};

/**
 * A minimal close button for panels, cards, and overlays.
 * Positioned for top-right corner placement in flex containers.
 *
 * @example
 * ```tsx
 * <CloseButton onClick={handleClose} />
 *
 * // With custom aria-label
 * <CloseButton aria-label="Dismiss notification" onClick={handleDismiss} />
 * ```
 */
const CloseButton = forwardRef<HTMLElement, CloseButtonProps>((props, ref) => {
  const { children, className = '', 'aria-label': ariaLabel = 'Close', ...rest } = props;
  return (
    <Button
      ref={ref}
      aria-label={ariaLabel}
      className={`close-btn ${className}`.trim()}
      {...rest}
    >
      {children ?? '✕'}
    </Button>
  );
});

CloseButton.displayName = 'CloseButton';

export { CloseButton };
export type { CloseButtonProps };
