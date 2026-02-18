// main/client/ui/src/components/Toast.tsx
import { useCallback, useEffect, type ReactElement } from 'react';

import { Button } from '../elements/Button';

import type { ToastMessage } from '@bslt/react';

import '../styles/components.css';

/** Props for a single Toast notification. */
type ToastProps = {
  /** Toast message data */
  message: ToastMessage;
  /** Auto-dismiss duration in ms */
  duration?: number;
  /** Callback when toast is dismissed */
  onDismiss?: (id: string) => void;
};

/**
 * A single toast notification with tone variants and manual dismiss.
 *
 * Supports `tone` from ToastMessage: `'info'`, `'success'`, `'danger'`, `'warning'`.
 * Defaults to `'info'` when no tone is specified. Auto-dismisses after `duration` ms.
 *
 * @example
 * ```tsx
 * <Toast message={{ id: '1', title: 'Saved!', tone: 'success' }} onDismiss={dismiss} />
 * ```
 */
export const Toast = ({ message, duration = 3500, onDismiss }: ToastProps): ReactElement => {
  useEffect(() => {
    const timer: ReturnType<typeof globalThis.setTimeout> = globalThis.setTimeout(() => {
      onDismiss?.(message.id);
    }, duration);
    return (): void => {
      globalThis.clearTimeout(timer);
    };
  }, [duration, message.id, onDismiss]);

  const handleDismiss = useCallback((): void => {
    onDismiss?.(message.id);
  }, [onDismiss, message.id]);

  const tone = message.tone ?? 'info';

  return (
    <div className="toast-card" data-tone={tone} role="status">
      <div className="toast-content">
        {message.title != null && message.title !== '' ? (
          <div className="toast-title">{message.title}</div>
        ) : null}
        {message.description != null && message.description !== '' ? (
          <div className="toast-description">{message.description}</div>
        ) : null}
      </div>
      {message.action != null ? (
        <Button className="toast-action" onClick={message.action.onClick}>
          {message.action.label}
        </Button>
      ) : null}
      {onDismiss !== undefined ? (
        <Button className="toast-dismiss" aria-label="Dismiss notification" onClick={handleDismiss}>
          ✕
        </Button>
      ) : null}
    </div>
  );
};

/** Props for the ToastContainer component. */
type ToastContainerProps = {
  /** Array of toast messages to display */
  messages: ToastMessage[];
  /** Callback when a toast is dismissed */
  onDismiss?: (id: string) => void;
};

/**
 * A container for rendering multiple toast notifications.
 *
 * Wraps individual Toast components and provides an `aria-live` region
 * for screen reader announcements of new notifications.
 *
 * @example
 * ```tsx
 * <ToastContainer messages={toasts} onDismiss={dismiss} />
 * ```
 */
export const ToastContainer = ({ messages, onDismiss }: ToastContainerProps): ReactElement => {
  return (
    <div className="toast" aria-live="polite" aria-relevant="additions">
      {messages.map((msg) => (
        <Toast key={msg.id} message={msg} {...(onDismiss !== undefined && { onDismiss })} />
      ))}
    </div>
  );
};
