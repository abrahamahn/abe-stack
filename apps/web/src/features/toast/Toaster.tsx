import { Toaster as ToasterBase } from '@abe-stack/ui';
import React from 'react';

import { toastStore } from './toastStore';

/**
 * App-specific Toaster that uses the local toastStore.
 * Wraps the generic Toaster from @abe-stack/ui.
 */
export const Toaster: React.FC = () => {
  const { messages, dismiss } = toastStore();
  return <ToasterBase messages={messages} onDismiss={dismiss} />;
};
