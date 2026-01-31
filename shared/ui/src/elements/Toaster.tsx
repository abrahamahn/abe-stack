// shared/ui/src/elements/Toaster.tsx
import '../styles/elements.css';
import { ToastContainer } from '@components/Toast';

import type { ToastMessage } from '@abe-stack/stores';
import type { ReactElement } from 'react';

/** Position options for the fixed-position toast container */
export type ToasterPosition = 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';

/**
 * Props for the Toaster component.
 *
 * @param messages - Array of toast messages to display
 * @param onDismiss - Callback when a toast is dismissed (auto or manual)
 * @param position - Fixed position on the viewport (default: 'top-right')
 */
export type ToasterProps = {
  /** Array of toast messages to display */
  messages: ToastMessage[];
  /** Callback when a toast is dismissed */
  onDismiss: (id: string) => void;
  /** Position of the toaster (default: top-right) */
  position?: ToasterPosition;
};

/**
 * A fixed-position toast notification container with screen reader support.
 *
 * Renders toast notifications in a fixed corner of the viewport.
 * The inner `ToastContainer` provides `aria-live` announcements for assistive technology.
 *
 * @param props - Toaster component props
 * @returns A fixed-position toast container element
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
export const Toaster = ({
  messages,
  onDismiss,
  position = 'top-right',
}: ToasterProps): ReactElement => {
  return (
    <div className="toaster" data-position={position}>
      <ToastContainer messages={messages} onDismiss={onDismiss} />
    </div>
  );
};
