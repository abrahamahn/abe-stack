// packages/ui/src/layouts/layers/Modal.tsx
import { FocusTrap } from '@components/FocusTrap';
import { Overlay } from '@layers/Overlay';
import {
  createContext,
  useContext,
  useEffect,
  useId,
  useState,
  type ComponentPropsWithoutRef,
  type ReactElement,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';

import '../../styles/components.css';

type ModalContextValue = {
  onClose?: () => void;
  titleId?: string;
  descriptionId?: string;
  setTitleId: (id: string | undefined) => void;
  setDescriptionId: (id: string | undefined) => void;
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
  const [titleId, setTitleId] = useState<string | undefined>(undefined);
  const [descriptionId, setDescriptionId] = useState<string | undefined>(undefined);

  useEffect((): (() => void) => {
    setMounted(true);
    return (): void => {
      setMounted(false);
    };
  }, []);

  useEffect((): (() => void) | undefined => {
    if (!open || !onClose) return undefined;

    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return (): void => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose]);

  if (!open || !mounted) return null;

  return createPortal(
    <ModalContext.Provider
      value={{ onClose, titleId, descriptionId, setTitleId, setDescriptionId }}
    >
      <Overlay open={open} onClick={onClose} />
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
      >
        <div className="modal-card">
          <FocusTrap>{children}</FocusTrap>
        </div>
      </div>
    </ModalContext.Provider>,
    document.body,
  );
}

function ModalTitle({ children, ...rest }: ComponentPropsWithoutRef<'h2'>): ReactElement {
  const { setTitleId } = useModalCtx();
  const id = useId();

  useEffect(() => {
    setTitleId(id);
    return (): void => {
      setTitleId(undefined);
    };
  }, [id, setTitleId]);

  return (
    <h2 id={id} className="modal-title" {...rest}>
      {children}
    </h2>
  );
}

function ModalDescription({ children, ...rest }: ComponentPropsWithoutRef<'p'>): ReactElement {
  const { setDescriptionId } = useModalCtx();
  const id = useId();

  useEffect(() => {
    setDescriptionId(id);
    return (): void => {
      setDescriptionId(undefined);
    };
  }, [id, setDescriptionId]);

  return (
    <p id={id} className="modal-description" {...rest}>
      {children}
    </p>
  );
}

function ModalHeader({ children, ...rest }: ComponentPropsWithoutRef<'div'>): ReactElement {
  return (
    <div className="modal-header" {...rest}>
      {children}
    </div>
  );
}

function ModalBody({ children, ...rest }: ComponentPropsWithoutRef<'div'>): ReactElement {
  return (
    <div className="modal-body" {...rest}>
      {children}
    </div>
  );
}

function ModalFooter({ children, ...rest }: ComponentPropsWithoutRef<'div'>): ReactElement {
  return (
    <div className="modal-footer" {...rest}>
      {children}
    </div>
  );
}

function ModalClose({ children, ...rest }: ComponentPropsWithoutRef<'button'>): ReactElement {
  const { onClose } = useModalCtx();
  return (
    <button type="button" onClick={onClose} aria-label="Close" {...rest}>
      {children ?? 'Close'}
    </button>
  );
}

export const Modal = {
  Root: ModalRoot,
  Title: ModalTitle,
  Description: ModalDescription,
  Header: ModalHeader,
  Body: ModalBody,
  Footer: ModalFooter,
  Close: ModalClose,
};
