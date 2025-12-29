import { useEffect, useRef, type ReactElement, type ReactNode } from 'react';

import { useDisclosure } from '../hooks/useDisclosure';
import './primitives.css';

type Placement = 'bottom' | 'right';

type PopoverProps = {
  trigger: ReactNode;
  placement?: Placement;
  children: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export function Popover({
  trigger,
  placement = 'bottom',
  children,
  open,
  onOpenChange,
}: PopoverProps): ReactElement {
  const { isOpen, toggle, close } = useDisclosure({
    defaultOpen: false,
    isOpen: open,
    onOpenChange,
  });
  const triggerRef = useRef<HTMLDivElement>(null);

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
    <div className="ui-popover" data-placement={placement}>
      <div
        ref={triggerRef}
        className="ui-trigger-reset"
        role="button"
        tabIndex={0}
        aria-expanded={isOpen}
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
        <div className="ui-popover-card" data-placement={placement}>
          {children}
        </div>
      ) : null}
    </div>
  );
}
