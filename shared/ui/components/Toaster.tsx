import { ToastContainer } from '../elements/Toast';

import type { ToastMessage } from '../contracts';
import type { CSSProperties, FC } from 'react';

export type ToasterProps = {
  /** Array of toast messages to display */
  messages: ToastMessage[];
  /** Callback when a toast is dismissed */
  onDismiss: (id: string) => void;
  /** Position of the toaster (default: top-right) */
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
};

const positionStyles: Record<NonNullable<ToasterProps['position']>, CSSProperties> = {
  'top-right': { top: 16, right: 16 },
  'top-left': { top: 16, left: 16 },
  'bottom-right': { bottom: 16, right: 16 },
  'bottom-left': { bottom: 16, left: 16 },
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
    <div style={{ position: 'fixed', zIndex: 9999, ...positionStyles[position] }}>
      <ToastContainer messages={messages} onDismiss={onDismiss} />
    </div>
  );
};
