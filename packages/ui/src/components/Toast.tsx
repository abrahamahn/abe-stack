import { useEffect, type ReactElement } from 'react';
import '../styles/components.css';

type ToastMessage = {
  id: string;
  title?: string;
  description?: string;
};

type ToastProps = {
  message: ToastMessage;
  duration?: number;
  onDismiss?: (id: string) => void;
};

export function Toast({ message, duration = 3500, onDismiss }: ToastProps): ReactElement {
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
        {message.title ? <div className="toast-title">{message.title}</div> : null}
        {message.description ? (
          <div className="toast-description">{message.description}</div>
        ) : null}
      </div>
    </div>
  );
}

type ToastContainerProps = {
  messages: ToastMessage[];
  onDismiss?: (id: string) => void;
};

export function ToastContainer({ messages, onDismiss }: ToastContainerProps): ReactElement {
  return (
    <div className="toast">
      {messages.map((msg) => (
        <Toast key={msg.id} message={msg} onDismiss={onDismiss} />
      ))}
    </div>
  );
}
