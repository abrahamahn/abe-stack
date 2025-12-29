import { useEffect, useRef, type ReactElement, type ReactNode } from 'react';

import { useDisclosure } from '../hooks/useDisclosure';
import './primitives.css';

type Placement = 'bottom' | 'right';

type DropdownProps = {
  trigger: ReactNode;
  placement?: Placement;
  children: ReactNode | ((close: () => void) => ReactNode);
  open?: boolean;
  defaultOpen?: boolean;
  onChange?: (open: boolean) => void;
};

export function Dropdown({
  trigger,
  placement = 'bottom',
  children,
  open,
  defaultOpen,
  onChange,
}: DropdownProps): ReactElement {
  const {
    open: isOpen,
    toggle,
    close,
    setOpen,
  } = useDisclosure({
    open,
    defaultOpen: defaultOpen ?? false,
    onChange,
  });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect((): (() => void) | undefined => {
    if (!isOpen) return undefined;

    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        close();
        triggerRef.current?.focus();
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        // Focus first/last focusable element in menu
        const menuItems = menuRef.current?.querySelectorAll<HTMLElement>(
          'button, a, [tabindex]:not([tabindex="-1"])',
        );
        if (menuItems && menuItems.length > 0) {
          const target = e.key === 'ArrowDown' ? menuItems[0] : menuItems[menuItems.length - 1];
          target?.focus();
        }
      }
    };

    window.addEventListener('keydown', onKey);
    return (): void => {
      window.removeEventListener('keydown', onKey);
    };
  }, [close, isOpen]);

  return (
    <div className="ui-dropdown" data-placement={placement}>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        className="ui-trigger-reset"
        onClick={() => {
          toggle();
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggle();
          }
          if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            if (!isOpen) {
              setOpen(true);
            }
          }
        }}
      >
        {trigger}
      </button>
      {isOpen ? (
        <div ref={menuRef} className="ui-dropdown-menu" role="menu" data-placement={placement}>
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
