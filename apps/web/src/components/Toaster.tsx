import { ToastContainer } from '@abe-stack/ui';
import React from 'react';

import { toastStore } from '../stores/toastStore';

export const Toaster: React.FC = () => {
  const { messages, dismiss } = toastStore();
  return (
    <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 9999 }}>
      <ToastContainer messages={messages} onDismiss={dismiss} />
    </div>
  );
};
