// shared/ui/src/hooks/useControllableState.ts
import { useCallback, useState } from 'react';

type UseControllableStateProps<T> = {
  /** Controlled value */
  value?: T;
  /** Initial value for uncontrolled usage */
  defaultValue?: T;
  /** Callback when value changes */
  onChange?: (value: T) => void;
};

/**
 * Hook for components that support both controlled and uncontrolled modes.
 *
 * @example
 * ```tsx
 * const [value, setValue] = useControllableState({ value, defaultValue, onChange });
 * ```
 */
export function useControllableState<T>({
  value,
  defaultValue,
  onChange,
}: UseControllableStateProps<T>): [T | undefined, (next: T) => void] {
  const [internal, setInternal] = useState<T | undefined>(defaultValue);
  const isControlled = value !== undefined;
  const current = isControlled ? value : internal;

  const setValue = useCallback(
    (next: T): void => {
      if (!isControlled) {
        setInternal(next);
      }
      onChange?.(next);
    },
    [isControlled, onChange],
  );

  return [current, setValue];
}
