// src/client/react/src/hooks/useOnScreen.ts
import { useEffect, useState, type RefObject } from 'react';

/**
 * Detect if an element is visible in the viewport using IntersectionObserver.
 * Useful for lazy loading, infinite scroll, animations on scroll.
 *
 * @param ref - React ref to the element to observe
 * @param options - IntersectionObserver options
 * @returns true if element is visible, false otherwise
 */
export function useOnScreen<T extends HTMLElement>(
  ref: RefObject<T | null>,
  options?: IntersectionObserverInit,
): boolean {
  const [isVisible, setIsVisible] = useState(false);

  useEffect((): (() => void) | undefined => {
    const element = ref.current;
    if (element === null || typeof IntersectionObserver === 'undefined') {
      return;
    }

    const callback: IntersectionObserverCallback = ([entry]) => {
      setIsVisible(entry?.isIntersecting ?? false);
    };
    const observer = new IntersectionObserver(callback, options);

    observer.observe(element);

    return (): void => {
      observer.disconnect();
    };
  }, [ref, options]);

  return isVisible;
}
