import {
  createContext,
  useRef,
  useCallback,
  useContext,
  useEffect,
  useId,
  useState,
  type ComponentPropsWithoutRef,
  type ReactElement,
  type RefObject,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';

import { FocusTrap } from '../components/FocusTrap';
import { useControllableState } from '../hooks/useControllableState';
import './primitives.css';

type DialogContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
  labelledBy?: string;
  describedBy?: string;
  setLabelledBy: (id?: string) => void;
  setDescribedBy: (id?: string) => void;
  triggerRef: RefObject<HTMLButtonElement | null>;
};

const DialogContext = createContext<DialogContextValue | null>(null);

function useDialogContext(component: string): DialogContextValue {
  const ctx = useContext(DialogContext);
  if (!ctx) {
    throw new Error(`${component} must be used within <Dialog.Root>`);
  }
  return ctx;
}

type DialogRootProps = {
  children: ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onChange?: (open: boolean) => void;
  closeOnEscape?: boolean;
  closeOnOverlayClick?: boolean;
};

export function DialogRoot({
  children,
  open,
  defaultOpen = false,
  onChange,
  closeOnEscape = true,
  closeOnOverlayClick = true,
}: DialogRootProps): ReactElement {
  const [currentOpen, setCurrentOpen] = useControllableState<boolean>({
    value: open,
    defaultValue: defaultOpen,
    onChange,
  });
  const isOpen = currentOpen ?? false;

  const [labelledBy, setLabelledBy] = useState<string | undefined>(undefined);
  const [describedBy, setDescribedBy] = useState<string | undefined>(undefined);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  const setOpen = useCallback(
    (next: boolean): void => {
      setCurrentOpen(next);
    },
    [setCurrentOpen],
  );
  const [mounted, setMounted] = useState(false);

  useEffect((): (() => void) => {
    setMounted(true);
    return (): void => {
      setMounted(false);
    };
  }, []);

  const handleOverlayClick = useCallback((): void => {
    setOpen(false);
  }, [setOpen]);

  useEffect((): (() => void) | undefined => {
    if (!closeOnEscape || !currentOpen) return undefined;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return (): void => {
      window.removeEventListener('keydown', onKey);
    };
  }, [closeOnEscape, currentOpen, setOpen]);

  const value: DialogContextValue = {
    open: isOpen,
    setOpen,
    labelledBy,
    describedBy,
    setLabelledBy,
    setDescribedBy,
    triggerRef,
  };

  return (
    <DialogContext.Provider value={value}>
      {children}
      {isOpen && mounted
        ? createPortal(
            <>
              <DialogOverlay onClick={closeOnOverlayClick ? handleOverlayClick : undefined} />
              <DialogContent />
            </>,
            document.body,
          )
        : null}
    </DialogContext.Provider>
  );
}

type DialogTriggerProps = ComponentPropsWithoutRef<'button'>;

export function DialogTrigger(props: DialogTriggerProps): ReactElement {
  const { setOpen, triggerRef } = useDialogContext('Dialog.Trigger');
  const { className = '', type = 'button', ...rest } = props;
  return (
    <button
      ref={triggerRef}
      type={type}
      className={className}
      onClick={(e) => {
        props.onClick?.(e);
        if (!e.defaultPrevented) setOpen(true);
      }}
      {...rest}
    />
  );
}

type DialogOverlayProps = ComponentPropsWithoutRef<'div'>;

export function DialogOverlay(props: DialogOverlayProps): ReactElement {
  const { className = '', ...rest } = props;
  return <div className={`ui-overlay ${className}`.trim()} {...rest} />;
}

type DialogContentProps = ComponentPropsWithoutRef<'div'> & { title?: ReactNode };

export function DialogContent(props: DialogContentProps): ReactElement | null {
  const { title, className = '', children, ...rest } = props;
  const { open, setLabelledBy, setDescribedBy, labelledBy, describedBy, setOpen, triggerRef } =
    useDialogContext('Dialog.Content');
  const titleId = useId();
  const contentRef = useRef<HTMLDivElement | null>(null);

  useEffect((): (() => void) => {
    setLabelledBy(title ? titleId : undefined);
    return (): void => {
      setLabelledBy(undefined);
    };
  }, [setLabelledBy, title, titleId]);

  useEffect((): (() => void) => {
    // Clear describedBy on mount/unmount; will be set by DialogDescription if present
    setDescribedBy(undefined);
    return (): void => {
      setDescribedBy(undefined);
    };
  }, [setDescribedBy]);

  useEffect((): void => {
    if (!open && triggerRef.current) {
      triggerRef.current.focus();
    }
  }, [open, triggerRef]);

  if (!open) return null;

  return (
    <div className={`ui-modal`} role="dialog" aria-modal="true">
      <FocusTrap>
        <div
          className={`ui-modal-card ${className}`.trim()}
          aria-labelledby={title ? titleId : labelledBy}
          aria-describedby={describedBy}
          {...rest}
          ref={(node) => {
            contentRef.current = node;
          }}
        >
          {title ? (
            <div id={titleId} style={{ fontWeight: 700, marginBottom: 8 }}>
              {title}
            </div>
          ) : null}
          {children}
          {/* Allow consumers to close by providing a button that calls setOpen(false) */}
          <button
            type="button"
            aria-label="Close dialog"
            onClick={() => {
              setOpen(false);
            }}
            style={{
              position: 'absolute',
              top: 12,
              right: 12,
              background: 'transparent',
              border: 0,
            }}
          >
            ×
          </button>
        </div>
      </FocusTrap>
    </div>
  );
}

type DialogDescriptionProps = ComponentPropsWithoutRef<'div'>;

export function DialogDescription(props: DialogDescriptionProps): ReactElement {
  const { className = '', ...rest } = props;
  const { setDescribedBy } = useDialogContext('Dialog.Description');
  const id = useId();

  useEffect((): (() => void) => {
    setDescribedBy(id);
    return (): void => {
      setDescribedBy(undefined);
    };
  }, [id, setDescribedBy]);

  return <div id={id} className={className} {...rest} />;
}

type DialogTitleProps = ComponentPropsWithoutRef<'div'>;

export function DialogTitle(props: DialogTitleProps): ReactElement {
  const { className = '', ...rest } = props;
  const id = useId();
  const { setLabelledBy } = useDialogContext('Dialog.Title');

  useEffect((): (() => void) => {
    setLabelledBy(id);
    return (): void => {
      setLabelledBy(undefined);
    };
  }, [id, setLabelledBy]);

  return <div id={id} className={className} {...rest} />;
}

export const Dialog = {
  Root: DialogRoot,
  Trigger: DialogTrigger,
  Overlay: DialogOverlay,
  Content: DialogContent,
  Title: DialogTitle,
  Description: DialogDescription,
};
