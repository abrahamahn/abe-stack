// packages/ui/src/components/Popover.tsx
import { useDisclosure } from '@hooks/useDisclosure';
import { useEffect, useId, useRef, type ReactElement, type ReactNode } from 'react';

import '../styles/components.css';

type Placement = 'bottom' | 'right';

type PopoverProps = {
  /** Trigger element */
  trigger: ReactNode;
  /** Popover position relative to trigger */
  placement?: Placement;
  /** Popover content */
  children: ReactNode;
  /** Controlled open state */
  open?: boolean;
  /** Initial open state for uncontrolled usage */
  defaultOpen?: boolean;
  /** Callback when open state changes */
  onChange?: (open: boolean) => void;
  /** Accessible label for the popover trigger button */
  'aria-label'?: string;
};

/**
 * A popover component for displaying rich content on trigger.
 *
 * @example
 * ```tsx
 * <Popover trigger={<button>Info</button>}>
 *   <p>Popover content here</p>
 * </Popover>
 * ```
 */
export function Popover({
  trigger,
  placement = 'bottom',
  children,
  open,
  defaultOpen,
  onChange,
  'aria-label': ariaLabel = 'Toggle popover',
}: PopoverProps): ReactElement {
  const {
    open: isOpen,
    toggle,
    close,
  } = useDisclosure({
    open,
    defaultOpen: defaultOpen ?? false,
    onChange,
  });
  const triggerRef = useRef<HTMLDivElement>(null);
  const popoverId = useId();

  useEffect((): (() => void) | undefined => {
    if (!isOpen) return undefined;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        close();
        triggerRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return (): void => {
      window.removeEventListener('keydown', onKey);
    };
  }, [close, isOpen]);

  return (
    <div className="popover" data-placement={placement}>
      <div
        ref={triggerRef}
        className="trigger-reset"
        role="button"
        tabIndex={0}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-controls={isOpen ? popoverId : undefined}
        aria-label={ariaLabel}
        onClick={() => {
          toggle();
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggle();
          }
        }}
      >
        {trigger}
      </div>
      {isOpen ? (
        <div
          id={popoverId}
          className="popover-card"
          data-placement={placement}
          role="dialog"
          aria-modal="false"
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}
