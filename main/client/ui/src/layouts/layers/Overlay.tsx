// main/client/ui/src/layouts/layers/Overlay.tsx
import { forwardRef, type ComponentPropsWithoutRef, type ReactElement } from 'react';
import { createPortal } from 'react-dom';
import '../../styles/elements.css';

type OverlayProps = ComponentPropsWithoutRef<'div'> & {
  /** Whether the overlay is visible */
  open: boolean;
  /** Callback invoked when the overlay is clicked (typically to dismiss) */
  onClick?: () => void;
};

/**
 * A full-screen semi-transparent backdrop rendered into a portal.
 * Used behind modals, side peeks, and other layered UI to dim background content
 * and optionally capture clicks for dismissal.
 *
 * @example
 * ```tsx
 * <Overlay open={isOpen} onClick={() => setIsOpen(false)} />
 * ```
 */
const OverlayRenderFn = (
  props: OverlayProps,
  ref: React.Ref<HTMLDivElement>,
): ReactElement | null => {
  const { open, className = '', onClick, ...rest } = props;
  // Portals require the DOM — guard synchronously since this is a client-only component.
  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div ref={ref} className={`overlay ${className}`.trim()} onClick={onClick} {...rest} />,
    document.body,
  );
};

export const Overlay = forwardRef<HTMLDivElement, OverlayProps>(OverlayRenderFn);

Overlay.displayName = 'Overlay';
