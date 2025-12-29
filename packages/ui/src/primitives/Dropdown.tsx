import { useEffect, useRef, type ReactElement, type ReactNode } from 'react';

import { useDisclosure } from '../hooks/useDisclosure';
import './primitives.css';

type Placement = 'bottom' | 'right';

type DropdownProps = {
  trigger: ReactNode;
  placement?: Placement;
  children: ReactNode | ((close: () => void) => ReactNode);
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export function Dropdown({
  trigger,
  placement = 'bottom',
  children,
  open,
  onOpenChange,
}: DropdownProps): ReactElement {
  const { isOpen, toggle, close, setOpen } = useDisclosure({
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
    <div className="ui-dropdown" data-placement={placement}>
      <div
        ref={triggerRef}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        role="button"
        tabIndex={0}
        className="ui-trigger-reset"
        onClick={() => {
          toggle();
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggle();
          }
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (!isOpen) setOpen(true);
          }
        }}
      >
        {trigger}
      </div>
      {isOpen ? (
        <div className="ui-dropdown-menu" role="menu" data-placement={placement}>
          {typeof children === 'function'
            ? (children as (close: () => void) => ReactNode)(() => {
                close();
              })
            : children}
        </div>
      ) : null}
    </div>
  );
}
