// packages/ui/src/elements/CloseButton.tsx
import type { ComponentPropsWithoutRef, ReactElement } from 'react';
import '../styles/elements.css';

type CloseButtonProps = ComponentPropsWithoutRef<'button'> & {
  /** Additional CSS class names */
  className?: string;
};

/**
 * A minimal close button for panels, cards, and overlays.
 * Positioned for top-right corner placement in flex containers.
 */
export const CloseButton = ({
  children,
  className = '',
  'aria-label': ariaLabel = 'Close',
  ...rest
}: CloseButtonProps): ReactElement => {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      className={`close-btn ${className}`.trim()}
      {...rest}
    >
      {children ?? '✕'}
    </button>
  );
};
