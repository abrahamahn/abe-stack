import { useEffect, type ReactElement } from 'react';
import './primitives.css';

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
    <div className="ui-toast-card">
      <div>
        {message.title ? <div style={{ fontWeight: 700 }}>{message.title}</div> : null}
        {message.description ? <div style={{ opacity: 0.8 }}>{message.description}</div> : null}
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
    <div className="ui-toast">
      {messages.map((msg) => (
        <Toast key={msg.id} message={msg} onDismiss={onDismiss} />
      ))}
    </div>
  );
}
