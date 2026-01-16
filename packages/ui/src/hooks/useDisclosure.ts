// packages/ui/src/hooks/useDisclosure.ts
import { useControllableState } from '@hooks/useControllableState';
import { useCallback } from 'react';


export type UseDisclosureProps = {
  open?: boolean;
  defaultOpen?: boolean;
  onChange?: (open: boolean) => void;
};

export function useDisclosure({ open, defaultOpen = false, onChange }: UseDisclosureProps): {
  open: boolean;
  openFn: () => void;
  close: () => void;
  toggle: () => void;
  setOpen: (open: boolean) => void;
} {
  const [openState, setOpen] = useControllableState<boolean>({
    value: open,
    defaultValue: defaultOpen,
    onChange,
  });

  const openFn = useCallback((): void => {
    setOpen(true);
  }, [setOpen]);
  const close = useCallback((): void => {
    setOpen(false);
  }, [setOpen]);
  const toggle = useCallback((): void => {
    setOpen(!openState);
  }, [openState, setOpen]);

  return {
    open: Boolean(openState),
    openFn,
    close,
    toggle,
    setOpen,
  };
}
