import type { Ref, RefCallback } from 'react';

/**
 * Utility to pass a ref through multiple components
 * Useful when you need to forward a ref and also use it internally
 */
export function passthroughRef<T>(...refs: (Ref<T> | undefined)[]): RefCallback<T> {
  return (value: T) => {
    refs.forEach((ref) => {
      if (typeof ref === 'function') {
        ref(value);
      } else if (ref && typeof ref === 'object') {
        (ref as { current: T | null }).current = value;
      }
    });
  };
}
