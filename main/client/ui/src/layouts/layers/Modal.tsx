// main/client/ui/src/layouts/layers/Modal.tsx
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
  /** Callback to close the modal */
  onClose?: () => void;
  /** Auto-generated ID linking the title element for aria-labelledby */
  titleId?: string;
  /** Auto-generated ID linking the description element for aria-describedby */
  descriptionId?: string;
  /** Registers the title element ID for accessibility */
  setTitleId: (id: string | undefined) => void;
  /** Registers the description element ID for accessibility */
  setDescriptionId: (id: string | undefined) => void;
};

const ModalContext = createContext<ModalContextValue | null>(null);
const useModalCtx = (): ModalContextValue => {
  const ctx = useContext(ModalContext);
  if (ctx === null) throw new Error('Modal compound components must be used within Modal.Root');
  return ctx;
};

type ModalRootProps = {
  /** Whether the modal is visible */
  open: boolean;
  /** Callback invoked when the modal requests to close (Escape key or overlay click) */
  onClose?: () => void;
  /** Modal content (use Modal.Header, Modal.Body, Modal.Footer compound components) */
  children: ReactNode;
};

/**
 * Root container for a modal dialog. Renders into a portal with an overlay backdrop,
 * focus trapping, Escape key dismissal, and ARIA dialog attributes.
 *
 * Use as `Modal.Root` with compound children: `Modal.Header`, `Modal.Title`,
 * `Modal.Description`, `Modal.Body`, `Modal.Footer`, and `Modal.Close`.
 *
 * @example
 * ```tsx
 * <Modal.Root open={isOpen} onClose={() => setIsOpen(false)}>
 *   <Modal.Header>
 *     <Modal.Title>Confirm Action</Modal.Title>
 *     <Modal.Close />
 *   </Modal.Header>
 *   <Modal.Body>Are you sure?</Modal.Body>
 *   <Modal.Footer>
 *     <Button onClick={handleConfirm}>Yes</Button>
 *   </Modal.Footer>
 * </Modal.Root>
 * ```
 */
const ModalRoot = ({ open, onClose, children }: ModalRootProps): ReactElement | null => {
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
    if (!open || onClose === undefined) return undefined;

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
      value={{
        ...(onClose !== undefined && { onClose }),
        ...(titleId !== undefined && { titleId }),
        ...(descriptionId !== undefined && { describedId: descriptionId }),
        setTitleId,
        setDescriptionId,
      }}
    >
      <Overlay open={open} {...(onClose !== undefined && { onClick: onClose })} />
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
};

/** Renders an `<h2>` that automatically registers with the modal for `aria-labelledby`. */
const ModalTitle = ({ children, ...rest }: ComponentPropsWithoutRef<'h2'>): ReactElement => {
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
};

/** Renders a `<p>` that automatically registers with the modal for `aria-describedby`. */
const ModalDescription = ({ children, ...rest }: ComponentPropsWithoutRef<'p'>): ReactElement => {
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
};

/** Container for the modal header area, typically holding a title and close button. */
const ModalHeader = ({ children, ...rest }: ComponentPropsWithoutRef<'div'>): ReactElement => {
  return (
    <div className="modal-header" {...rest}>
      {children}
    </div>
  );
};

/** Scrollable content area for the modal's primary content. */
const ModalBody = ({ children, ...rest }: ComponentPropsWithoutRef<'div'>): ReactElement => {
  return (
    <div className="modal-body" {...rest}>
      {children}
    </div>
  );
};

/** Container for action buttons at the bottom of the modal. */
const ModalFooter = ({ children, ...rest }: ComponentPropsWithoutRef<'div'>): ReactElement => {
  return (
    <div className="modal-footer" {...rest}>
      {children}
    </div>
  );
};

/** A button that invokes the modal's `onClose` callback. Defaults to "Close" text if no children provided. */
const ModalClose = ({ children, ...rest }: ComponentPropsWithoutRef<'button'>): ReactElement => {
  const { onClose } = useModalCtx();
  return (
    <button type="button" onClick={onClose} aria-label="Close" {...rest}>
      {children ?? 'Close'}
    </button>
  );
};

/**
 * Accessible modal dialog built with compound components.
 * Renders in a portal with overlay, focus trapping, and Escape key support.
 *
 * @example
 * ```tsx
 * <Modal.Root open={isOpen} onClose={() => setIsOpen(false)}>
 *   <Modal.Header>
 *     <Modal.Title>Delete Item</Modal.Title>
 *     <Modal.Close />
 *   </Modal.Header>
 *   <Modal.Body>
 *     <Modal.Description>This action cannot be undone.</Modal.Description>
 *   </Modal.Body>
 *   <Modal.Footer>
 *     <Button onClick={onDelete}>Delete</Button>
 *   </Modal.Footer>
 * </Modal.Root>
 * ```
 */
export const Modal = {
  Root: ModalRoot,
  Title: ModalTitle,
  Description: ModalDescription,
  Header: ModalHeader,
  Body: ModalBody,
  Footer: ModalFooter,
  Close: ModalClose,
};
