// shared/ui/src/hooks/useDisclosure.ts
import { useControllableState } from '@hooks/useControllableState';
import { useCallback } from 'react';

export type UseDisclosureProps = {
  /** Controlled open state */
  open?: boolean;
  /** Initial open state for uncontrolled usage */
  defaultOpen?: boolean;
  /** Callback when open state changes */
  onChange?: (open: boolean) => void;
};

/**
 * Hook for managing open/close state of dialogs, dropdowns, etc.
 *
 * @example
 * ```tsx
 * const { open, openFn, close, toggle } = useDisclosure();
 * ```
 */
export function useDisclosure({ open, defaultOpen = false, onChange }: UseDisclosureProps): {
  open: boolean;
  openFn: () => void;
  close: () => void;
  toggle: () => void;
  setOpen: (open: boolean) => void;
} {
  const [openState, setOpen] = useControllableState<boolean>({
    ...(open !== undefined && { value: open }),
    defaultValue: defaultOpen,
    ...(onChange !== undefined && { onChange }),
  });

  const openFn = useCallback((): void => {
    setOpen(true);
  }, [setOpen]);
  const close = useCallback((): void => {
    setOpen(false);
  }, [setOpen]);
  const toggle = useCallback((): void => {
    setOpen(!(openState ?? false));
  }, [openState, setOpen]);

  return {
    open: Boolean(openState),
    openFn,
    close,
    toggle,
    setOpen,
  };
}
