// packages/ui/src/components/FocusTrap.tsx
import { useEffect, useRef, type ReactElement, type ReactNode } from 'react';

import '../styles/components.css';

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

/**
 * Traps focus within its children, restoring focus on unmount.
 *
 * @example
 * ```tsx
 * <FocusTrap>
 *   <dialog>
 *     <button>Focusable</button>
 *   </dialog>
 * </FocusTrap>
 * ```
 */
export function FocusTrap({ children }: { children: ReactNode }): ReactElement {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect((): (() => void) => {
    const root = rootRef.current;
    if (!root) return (): void => {};

    const previousActive = document.activeElement as HTMLElement | null;

    const focusables = Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE));
    if (focusables.length > 0) {
      focusables[0]?.focus();
    }

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== 'Tab') return;

      const list = Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (list.length === 0) return;

      const first = list[0];
      const last = list[list.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        last?.focus();
        event.preventDefault();
      } else if (!event.shiftKey && document.activeElement === last) {
        first?.focus();
        event.preventDefault();
      }
    };

    root.addEventListener('keydown', handleKeyDown);
    return (): void => {
      root.removeEventListener('keydown', handleKeyDown);
      previousActive?.focus();
    };
  }, []);

  return <div ref={rootRef}>{children}</div>;
}
