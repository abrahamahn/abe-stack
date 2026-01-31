// client/ui/src/components/Dropdown.tsx
import { useDisclosure } from '@hooks/useDisclosure';
import { useEffect, useRef, type ReactElement, type ReactNode } from 'react';

import '../styles/components.css';

type Placement = 'bottom' | 'right';

type DropdownProps = {
  /** Trigger button content */
  trigger: ReactNode;
  /** Menu position relative to trigger */
  placement?: Placement;
  /** Menu content or render function with close callback */
  children: ReactNode | ((close: () => void) => ReactNode);
  /** Controlled open state */
  open?: boolean;
  /** Initial open state for uncontrolled usage */
  defaultOpen?: boolean;
  /** Callback when open state changes */
  onChange?: (open: boolean) => void;
};

/**
 * A dropdown menu with keyboard navigation and flexible content.
 *
 * @example
 * ```tsx
 * <Dropdown trigger={<button>Menu</button>}>
 *   <MenuItem>Edit</MenuItem>
 *   <MenuItem>Delete</MenuItem>
 * </Dropdown>
 * ```
 */
export const Dropdown = ({
  trigger,
  placement = 'bottom',
  children,
  open,
  defaultOpen,
  onChange,
}: DropdownProps): ReactElement => {
  const {
    open: isOpen,
    toggle,
    close,
    setOpen,
  } = useDisclosure({
    ...(open !== undefined && { open }),
    defaultOpen: defaultOpen ?? false,
    ...(onChange !== undefined && { onChange }),
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
        if (menuItems != null && menuItems.length > 0) {
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
    <div className="dropdown" data-placement={placement}>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        className="trigger-reset"
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
        <div ref={menuRef} className="dropdown-menu" role="menu" data-placement={placement}>
          {typeof children === 'function'
            ? (children as (close: () => void) => ReactNode)(() => {
                close();
              })
            : children}
        </div>
      ) : null}
    </div>
  );
};
