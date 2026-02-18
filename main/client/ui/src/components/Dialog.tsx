// main/client/ui/src/components/Dialog.tsx
import { FocusTrap } from '@components/FocusTrap';
import { useControllableState } from '@hooks/useControllableState';
import {
  Children,
  createContext,
  isValidElement,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type ReactElement,
  type ReactNode,
  type RefObject,
} from 'react';
import { createPortal } from 'react-dom';

import { Button } from '../elements/Button';
import { cn } from '../utils/cn';

import '../styles/components.css';

type DialogContextValue = {
  /** Whether the dialog is currently open */
  open: boolean;
  /** Sets the open state of the dialog */
  setOpen: (open: boolean) => void;
  /** ID of the element labeling the dialog */
  labelledBy?: string;
  /** ID of the element describing the dialog */
  describedBy?: string;
  /** Registers the aria-labelledby ID */
  setLabelledBy: (id?: string) => void;
  /** Registers the aria-describedby ID */
  setDescribedBy: (id?: string) => void;
  /** Ref to the trigger element for focus restoration */
  triggerRef: RefObject<HTMLElement | null>;
};

const DialogContext = createContext<DialogContextValue | null>(null);

function useDialogContext(component: string): DialogContextValue {
  const ctx = useContext(DialogContext);
  if (ctx == null) {
    throw new Error(`${component} must be used within <Dialog.Root>`);
  }
  return ctx;
}

type DialogRootProps = {
  /** Dialog components */
  children: ReactNode;
  /** Controlled open state */
  open?: boolean;
  /** Initial open state for uncontrolled usage */
  defaultOpen?: boolean;
  /** Callback when state changes */
  onChange?: (open: boolean) => void;
  /** Close dialog on ESC key */
  closeOnEscape?: boolean;
  /** Close dialog on overlay click */
  closeOnOverlayClick?: boolean;
};

/**
 * A compound component for building accessible modal dialogs.
 *
 * @example
 * ```tsx
 * <Dialog.Root>
 *   <Dialog.Trigger>Open</Dialog.Trigger>
 *   <Dialog.Content title="Dialog Title">
 *     <p>Content</p>
 *   </Dialog.Content>
 * </Dialog.Root>
 * ```
 */
export const DialogRoot = ({
  children,
  open,
  defaultOpen = false,
  onChange,
  closeOnEscape = true,
  closeOnOverlayClick = true,
}: DialogRootProps): ReactElement => {
  const [currentOpen, setCurrentOpen] = useControllableState<boolean>({
    ...(open !== undefined && { value: open }),
    defaultValue: defaultOpen,
    ...(onChange !== undefined && { onChange }),
  });
  const isOpen = currentOpen ?? false;

  const [labelledBy, setLabelledBy] = useState<string | undefined>(undefined);
  const [describedBy, setDescribedBy] = useState<string | undefined>(undefined);
  const triggerRef = useRef<HTMLElement | null>(null);

  const setOpen = useCallback(
    (next: boolean): void => {
      setCurrentOpen(next);
    },
    [setCurrentOpen],
  );
  // Portals require the DOM to be available. This ref tracks client-side mounting
  // by checking document existence synchronously, avoiding an extra render cycle.
  const mounted = typeof document !== 'undefined';

  const handleOverlayClick = useCallback((): void => {
    setOpen(false);
  }, [setOpen]);

  useEffect((): (() => void) | undefined => {
    if (!closeOnEscape || !isOpen) return undefined;
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
  }, [closeOnEscape, isOpen, setOpen]);

  const value: DialogContextValue = {
    open: isOpen,
    setOpen,
    ...(labelledBy !== undefined && { labelledBy }),
    ...(describedBy !== undefined && { describedBy }),
    setLabelledBy,
    setDescribedBy,
    triggerRef,
  };

  const contentChildren = Children.toArray(children).filter((child) => {
    return isValidElement(child) && child.type === DialogContent;
  });
  const nonContentChildren = Children.toArray(children).filter((child) => {
    return !isValidElement(child) || child.type !== DialogContent;
  });

  return (
    <DialogContext.Provider value={value}>
      {nonContentChildren}
      {isOpen && mounted
        ? createPortal(
            <>
              <DialogOverlay onClick={closeOnOverlayClick ? handleOverlayClick : undefined} />
              {contentChildren}
            </>,
            document.body,
          )
        : null}
    </DialogContext.Provider>
  );
};

/** Props for the Dialog trigger button. */
type DialogTriggerProps = ComponentPropsWithoutRef<'button'>;

/** Trigger button to open the dialog. */
export const DialogTrigger = (props: DialogTriggerProps): ReactElement => {
  const { setOpen, triggerRef } = useDialogContext('Dialog.Trigger');
  const { className = '', type = 'button', ...rest } = props;
  return (
    <Button
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
};

/** Props for the Dialog background overlay. */
type DialogOverlayProps = ComponentPropsWithoutRef<'div'>;

/** Background overlay displayed behind the dialog. */
export const DialogOverlay = (props: DialogOverlayProps): ReactElement => {
  const { className, ...rest } = props;
  return <div className={cn('overlay', className)} {...rest} />;
};

type DialogContentProps = ComponentPropsWithoutRef<'div'> & {
  /** Dialog title (sets aria-labelledby) */
  title?: ReactNode;
};

/** Dialog content container with focus trapping. */
export const DialogContent = (props: DialogContentProps): ReactElement | null => {
  const { title, className, children, ...rest } = props;
  const { open, setLabelledBy, setDescribedBy, labelledBy, describedBy, setOpen, triggerRef } =
    useDialogContext('Dialog.Content');
  const titleId = useId();
  const contentRef = useRef<HTMLDivElement | null>(null);

  useEffect((): (() => void) | undefined => {
    if (title == null) return undefined;
    setLabelledBy(titleId);
    return (): void => {
      setLabelledBy(undefined);
    };
  }, [setLabelledBy, title, titleId]);

  useEffect((): (() => void) => {
    return (): void => {
      setDescribedBy(undefined);
    };
  }, [setDescribedBy]);

  useEffect((): void => {
    if (!open && triggerRef.current != null) {
      triggerRef.current.focus();
    }
  }, [open, triggerRef]);

  if (!open) return null;

  return (
    <div
      className="modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title != null ? titleId : labelledBy}
      aria-describedby={describedBy}
    >
      <FocusTrap>
        <div
          className={cn('modal-card', className)}
          {...rest}
          ref={(node) => {
            contentRef.current = node;
          }}
        >
          {title != null ? (
            <div id={titleId} className="dialog-title">
              {title}
            </div>
          ) : null}
          {children}
          {/* Allow consumers to close by providing a button that calls setOpen(false) */}
          <Button
            aria-label="Close dialog"
            className="dialog-close"
            onClick={() => {
              setOpen(false);
            }}
          >
            ×
          </Button>
        </div>
      </FocusTrap>
    </div>
  );
};

/** Props for the Dialog description element. */
type DialogDescriptionProps = ComponentPropsWithoutRef<'div'>;

/** Dialog description (sets aria-describedby). */
export const DialogDescription = (props: DialogDescriptionProps): ReactElement => {
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
};

/** Props for the Dialog title element. */
type DialogTitleProps = ComponentPropsWithoutRef<'div'>;

/** Dialog title element (sets aria-labelledby). */
export const DialogTitle = (props: DialogTitleProps): ReactElement => {
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
};

export const Dialog = {
  Root: DialogRoot,
  Trigger: DialogTrigger,
  Overlay: DialogOverlay,
  Content: DialogContent,
  Title: DialogTitle,
  Description: DialogDescription,
};
