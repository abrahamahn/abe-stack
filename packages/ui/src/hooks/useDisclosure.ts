import { useCallback } from 'react';

import { useControllableState } from './useControllableState';

export type UseDisclosureProps = {
  isOpen?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export function useDisclosure({ isOpen, defaultOpen = false, onOpenChange }: UseDisclosureProps): {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
  setOpen: (open: boolean) => void;
} {
  const [openState, setOpen] = useControllableState<boolean>({
    value: isOpen,
    defaultValue: defaultOpen,
    onChange: onOpenChange,
  });

  const open = useCallback((): void => {
    setOpen(true);
  }, [setOpen]);
  const close = useCallback((): void => {
    setOpen(false);
  }, [setOpen]);
  const toggle = useCallback((): void => {
    setOpen(!openState);
  }, [openState, setOpen]);

  return {
    isOpen: Boolean(openState),
    open,
    close,
    toggle,
    setOpen,
  };
}
