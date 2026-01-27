// packages/ui/src/components/Toast.tsx
import { useEffect, type ReactElement } from 'react';

import type { ToastMessage } from '@abe-stack/stores';

import '../styles/components.css';

type ToastProps = {
  /** Toast message data */
  message: ToastMessage;
  /** Auto-dismiss duration in ms */
  duration?: number;
  /** Callback when toast is dismissed */
  onDismiss?: (id: string) => void;
};

/**
 * A single toast notification that auto-dismisses.
 *
 * @example
 * ```tsx
 * <Toast message={{ id: '1', title: 'Success!' }} onDismiss={dismiss} />
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

  return (
    <div className="toast-card">
      <div>
        {message.title != null && message.title !== '' ? (
          <div className="toast-title">{message.title}</div>
        ) : null}
        {message.description != null && message.description !== '' ? (
          <div className="toast-description">{message.description}</div>
        ) : null}
      </div>
    </div>
  );
};

type ToastContainerProps = {
  /** Array of toast messages to display */
  messages: ToastMessage[];
  /** Callback when a toast is dismissed */
  onDismiss?: (id: string) => void;
};

/**
 * A container for rendering multiple toast notifications.
 *
 * @example
 * ```tsx
 * <ToastContainer messages={toasts} onDismiss={dismiss} />
 * ```
 */
export const ToastContainer = ({ messages, onDismiss }: ToastContainerProps): ReactElement => {
  return (
    <div className="toast">
      {messages.map((msg) => (
        <Toast
          key={msg.id}
          message={msg}
          {...(onDismiss !== undefined && { onDismiss })}
        />
      ))}
    </div>
  );
};
