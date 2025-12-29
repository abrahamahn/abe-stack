import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ComponentPropsWithoutRef,
  type ReactElement,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';

import { FocusTrap } from '../components/FocusTrap';

import { Overlay } from './Overlay';
import './primitives.css';

type ModalContextValue = {
  onClose?: () => void;
};

const ModalContext = createContext<ModalContextValue | null>(null);
const useModalCtx = (): ModalContextValue => {
  const ctx = useContext(ModalContext);
  if (!ctx) throw new Error('Modal compound components must be used within Modal.Root');
  return ctx;
};

type ModalRootProps = {
  open: boolean;
  onClose?: () => void;
  children: ReactNode;
};

function ModalRoot({ open, onClose, children }: ModalRootProps): ReactElement | null {
  const [mounted, setMounted] = useState(false);

  useEffect((): (() => void) => {
    setMounted(true);
    return (): void => {
      setMounted(false);
    };
  }, []);

  if (!open || !mounted) return null;

  return createPortal(
    <ModalContext.Provider value={{ onClose }}>
      <Overlay open={open} onClick={onClose} />
      <div className="ui-modal" role="dialog" aria-modal="true">
        <div className="ui-modal-card">
          <FocusTrap>{children}</FocusTrap>
        </div>
      </div>
    </ModalContext.Provider>,
    document.body,
  );
}

function ModalHeader({ children, ...rest }: ComponentPropsWithoutRef<'div'>): ReactElement {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }} {...rest}>
      {children}
    </div>
  );
}

function ModalBody({ children, ...rest }: ComponentPropsWithoutRef<'div'>): ReactElement {
  return (
    <div style={{ display: 'grid', gap: 8 }} {...rest}>
      {children}
    </div>
  );
}

function ModalFooter({ children, ...rest }: ComponentPropsWithoutRef<'div'>): ReactElement {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }} {...rest}>
      {children}
    </div>
  );
}

function ModalClose({ children, ...rest }: ComponentPropsWithoutRef<'button'>): ReactElement {
  const { onClose } = useModalCtx();
  return (
    <button type="button" onClick={onClose} {...rest}>
      {children ?? 'Close'}
    </button>
  );
}

export const Modal = {
  Root: ModalRoot,
  Header: ModalHeader,
  Body: ModalBody,
  Footer: ModalFooter,
  Close: ModalClose,
};
