// src/client/ui/src/layouts/layers/SidePeek.tsx
/**
 * SidePeek - Notion-style slide-out panel from the right.
 *
 * Opens content in a side panel while keeping the background visible.
 * URL is updated to reflect the peek state (e.g., `?peek=/users/123`).
 *
 * @example
 * // Basic usage with PeekLink
 * <PeekLink to="/users/123">View User</PeekLink>
 *
 * // Renders user page in side peek when clicked
 * <SidePeek.Root>
 *   <SidePeek.Content>
 *     <UserPage />
 *   </SidePeek.Content>
 * </SidePeek.Root>
 *
 * @example
 * // Controlled usage
 * const { isOpen, peekPath, open, close } = useSidePeek();
 *
 * <button onClick={() => open('/settings')}>Open Settings</button>
 *
 * <SidePeek.Root open={isOpen} onClose={close}>
 *   <SidePeek.Content>
 *     {peekPath === '/settings' && <SettingsPage />}
 *   </SidePeek.Content>
 * </SidePeek.Root>
 */

import { FocusTrap } from '@components/FocusTrap';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useState,
  type ComponentPropsWithoutRef,
  type ReactElement,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';

import '../../styles/components.css';

// ============================================================================
// Types
// ============================================================================

type SidePeekSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

type SidePeekContextValue = {
  onClose?: () => void;
  titleId?: string;
  descriptionId?: string;
  setTitleId: (id: string | undefined) => void;
  setDescriptionId: (id: string | undefined) => void;
  size: SidePeekSize;
};

// ============================================================================
// Context
// ============================================================================

const SidePeekContext = createContext<SidePeekContextValue | null>(null);

function useSidePeekContext(): SidePeekContextValue {
  const ctx = useContext(SidePeekContext);
  if (ctx == null) {
    throw new Error('SidePeek compound components must be used within SidePeek.Root');
  }
  return ctx;
}

// ============================================================================
// Root Component
// ============================================================================

type SidePeekRootProps = {
  /** Whether the side peek panel is visible */
  open: boolean;
  /** Callback invoked when the panel requests to close */
  onClose?: () => void;
  /** Panel content (use SidePeek.Header, SidePeek.Content, SidePeek.Footer compound components) */
  children: ReactNode;
  /** Panel width: sm (320px), md (480px), lg (640px), xl (800px), full (100%) */
  size?: SidePeekSize;
  /** Close when clicking the overlay */
  closeOnOverlayClick?: boolean;
  /** Close when pressing Escape */
  closeOnEscape?: boolean;
};

/** Root container that manages open/close state, animations, focus trapping, and body scroll lock. */
const SidePeekRoot = ({
  open,
  onClose,
  children,
  size = 'md',
  closeOnOverlayClick = true,
  closeOnEscape = true,
}: SidePeekRootProps): ReactElement | null => {
  const [mounted, setMounted] = useState(false);
  const [titleId, setTitleId] = useState<string | undefined>(undefined);
  const [descriptionId, setDescriptionId] = useState<string | undefined>(undefined);
  const [isAnimating, setIsAnimating] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);

  // Handle mount
  useEffect((): (() => void) => {
    setMounted(true);
    return (): void => {
      setMounted(false);
    };
  }, []);

  // Handle animation states
  useEffect((): (() => void) | undefined => {
    if (open) {
      setShouldRender(true);
      // Small delay to trigger CSS transition
      const timer = setTimeout(() => {
        setIsAnimating(true);
      }, 10);
      return (): void => {
        clearTimeout(timer);
      };
    }
    // Start slide-out animation
    setIsAnimating(false);
    // Wait for CSS transition to complete before unmounting (matches 0.2s in CSS)
    const timer = setTimeout(() => {
      setShouldRender(false);
    }, 200);
    return (): void => {
      clearTimeout(timer);
    };
  }, [open]);

  // Handle escape key
  useEffect((): (() => void) | undefined => {
    if (!closeOnEscape || !open || onClose == null) return undefined;

    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return (): void => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [closeOnEscape, open, onClose]);

  // Prevent body scroll when open
  useEffect((): (() => void) | undefined => {
    if (!open) return undefined;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return (): void => {
      document.body.style.overflow = originalOverflow;
    };
  }, [open]);

  const handleOverlayClick = useCallback((): void => {
    if (closeOnOverlayClick && onClose != null) {
      onClose();
    }
  }, [closeOnOverlayClick, onClose]);

  if (!shouldRender || !mounted) return null;

  return createPortal(
    <SidePeekContext.Provider
      value={{
        ...(onClose !== undefined && { onClose }),
        ...(titleId !== undefined && { titleId }),
        ...(descriptionId !== undefined && { describedId: descriptionId }),
        setTitleId,
        setDescriptionId,
        size,
      }}
    >
      {/* Overlay */}
      <div
        className={`side-peek-overlay ${isAnimating ? 'side-peek-overlay--open' : ''}`}
        onClick={handleOverlayClick}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        className={`side-peek side-peek--${size} ${isAnimating ? 'side-peek--open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
      >
        <FocusTrap>{children}</FocusTrap>
      </div>
    </SidePeekContext.Provider>,
    document.body,
  );
};

// ============================================================================
// Header Component
// ============================================================================

type SidePeekHeaderProps = ComponentPropsWithoutRef<'div'>;

/** Container for the panel header area, typically holding a title and close/expand buttons. */
const SidePeekHeader = ({
  children,
  className = '',
  ...rest
}: SidePeekHeaderProps): ReactElement => {
  return (
    <div className={`side-peek-header ${className}`.trim()} {...rest}>
      {children}
    </div>
  );
};

// ============================================================================
// Title Component
// ============================================================================

type SidePeekTitleProps = ComponentPropsWithoutRef<'h2'>;

/** Renders an `<h2>` that automatically registers with the panel for `aria-labelledby`. */
const SidePeekTitle = ({ children, className = '', ...rest }: SidePeekTitleProps): ReactElement => {
  const { setTitleId } = useSidePeekContext();
  const id = useId();

  useEffect((): (() => void) => {
    setTitleId(id);
    return (): void => {
      setTitleId(undefined);
    };
  }, [id, setTitleId]);

  return (
    <h2 id={id} className={`side-peek-title ${className}`.trim()} {...rest}>
      {children}
    </h2>
  );
};

// ============================================================================
// Description Component
// ============================================================================

type SidePeekDescriptionProps = ComponentPropsWithoutRef<'p'>;

/** Renders a `<p>` that automatically registers with the panel for `aria-describedby`. */
const SidePeekDescription = ({
  children,
  className = '',
  ...rest
}: SidePeekDescriptionProps): ReactElement => {
  const { setDescriptionId } = useSidePeekContext();
  const id = useId();

  useEffect((): (() => void) => {
    setDescriptionId(id);
    return (): void => {
      setDescriptionId(undefined);
    };
  }, [id, setDescriptionId]);

  return (
    <p id={id} className={`side-peek-description ${className}`.trim()} {...rest}>
      {children}
    </p>
  );
};

// ============================================================================
// Content Component
// ============================================================================

type SidePeekContentProps = ComponentPropsWithoutRef<'div'>;

/** Scrollable content area for the panel's primary content. */
const SidePeekContent = ({
  children,
  className = '',
  ...rest
}: SidePeekContentProps): ReactElement => {
  return (
    <div className={`side-peek-content ${className}`.trim()} {...rest}>
      {children}
    </div>
  );
};

// ============================================================================
// Footer Component
// ============================================================================

type SidePeekFooterProps = ComponentPropsWithoutRef<'div'>;

/** Container for action buttons at the bottom of the panel. */
const SidePeekFooter = ({
  children,
  className = '',
  ...rest
}: SidePeekFooterProps): ReactElement => {
  return (
    <div className={`side-peek-footer ${className}`.trim()} {...rest}>
      {children}
    </div>
  );
};

// ============================================================================
// Close Button Component
// ============================================================================

type SidePeekCloseProps = ComponentPropsWithoutRef<'button'>;

/** A button that invokes the panel's `onClose` callback. Defaults to a close icon if no children provided. */
const SidePeekClose = ({ children, className = '', ...rest }: SidePeekCloseProps): ReactElement => {
  const { onClose } = useSidePeekContext();

  return (
    <button
      type="button"
      onClick={onClose}
      aria-label="Close"
      className={`side-peek-close ${className}`.trim()}
      {...rest}
    >
      {children ?? '×'}
    </button>
  );
};

// ============================================================================
// Export
// ============================================================================

export const SidePeek = {
  Root: SidePeekRoot,
  Header: SidePeekHeader,
  Title: SidePeekTitle,
  Description: SidePeekDescription,
  Content: SidePeekContent,
  Footer: SidePeekFooter,
  Close: SidePeekClose,
};

export type {
  SidePeekCloseProps,
  SidePeekContentProps,
  SidePeekDescriptionProps,
  SidePeekFooterProps,
  SidePeekHeaderProps,
  SidePeekRootProps,
  SidePeekSize,
  SidePeekTitleProps,
};
