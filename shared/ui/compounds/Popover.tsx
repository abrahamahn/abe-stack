import { useEffect, useRef, type ReactElement, type ReactNode } from 'react';

import { useDisclosure } from '../hooks/useDisclosure';
import '../styles/elements.css';

type Placement = 'bottom' | 'right';

type PopoverProps = {
  trigger: ReactNode;
  placement?: Placement;
  children: ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onChange?: (open: boolean) => void;
};

export function Popover({
  trigger,
  placement = 'bottom',
  children,
  open,
  defaultOpen,
  onChange,
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
