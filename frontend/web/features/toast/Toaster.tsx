import { Toaster as ToasterBase } from '@ui';

import { toastStore } from './toastStore';

import type { ReactElement } from 'react';

/**
 * App-specific Toaster that uses the local toastStore.
 * Wraps the generic Toaster from @abe-stack/ui.
 */
export function Toaster(): ReactElement {
  const { messages, dismiss } = toastStore();
  return <ToasterBase messages={messages} onDismiss={dismiss} />;
}
