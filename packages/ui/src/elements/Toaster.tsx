// packages/ui/src/elements/Toaster.tsx
import '../styles/elements.css';
import { ToastContainer } from '../components/Toast';

import type { ToastMessage } from '@abe-stack/shared';
import type { FC } from 'react';

export type ToasterProps = {
  /** Array of toast messages to display */
  messages: ToastMessage[];
  /** Callback when a toast is dismissed */
  onDismiss: (id: string) => void;
  /** Position of the toaster (default: top-right) */
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
};

/**
 * A fixed-position toast notification container.
 *
 * @example
 * ```tsx
 * // With toastStore from shared package
 * const { messages, dismiss } = toastStore();
 * <Toaster messages={messages} onDismiss={dismiss} />
 *
 * // With custom position
 * <Toaster messages={messages} onDismiss={dismiss} position="bottom-right" />
 * ```
 */
export const Toaster: FC<ToasterProps> = ({ messages, onDismiss, position = 'top-right' }) => {
  return (
    <div className="toaster" data-position={position}>
      <ToastContainer messages={messages} onDismiss={onDismiss} />
    </div>
  );
};
