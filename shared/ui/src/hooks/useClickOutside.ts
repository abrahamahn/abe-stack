// shared/ui/src/hooks/useClickOutside.ts
import { useEffect, type RefObject } from 'react';

/**
 * Hook to detect clicks outside a referenced element.
 *
 * @example
 * ```tsx
 * const ref = useRef<HTMLDivElement>(null);
 * useClickOutside(ref, () => close());
 * ```
 */
export function useClickOutside<T extends HTMLElement>(
  ref: RefObject<T | null>,
  handler: (event: MouseEvent | TouchEvent) => void,
): void {
  useEffect((): (() => void) => {
    const listener = (event: MouseEvent | TouchEvent): void => {
      const node = ref.current;
      if (node === null) {
        return;
      }
      if (node.contains(event.target as Node)) return;
      handler(event);
    };

    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);
    return (): void => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
    };
  }, [handler, ref]);
}
