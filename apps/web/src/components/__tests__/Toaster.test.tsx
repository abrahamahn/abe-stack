// apps/web/src/components/__tests__/Toaster.test.tsx
/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { render, screen, cleanup } from '@testing-library/react';
import React, { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { toastStore } from '../../stores/toastStore';
import { Toaster } from '../Toaster';

// Mock the ToastContainer from UI package
vi.mock('@abe-stack/ui', () => ({
  ToastContainer: vi.fn(
    ({
      messages,
      onDismiss,
    }: {
      messages: { id: string; title?: string; description?: string }[];
      onDismiss: (id: string) => void;
    }): React.ReactElement => (
      <div data-testid="toast-container">
        {messages.map((msg) => (
          <div key={msg.id} data-testid={`toast-${msg.id}`}>
            {msg.title && <div data-testid="toast-title">{msg.title}</div>}
            {msg.description && <div data-testid="toast-description">{msg.description}</div>}
            <button
              onClick={() => {
                onDismiss(msg.id);
              }}
              data-testid={`dismiss-${msg.id}`}
            >
              Dismiss
            </button>
          </div>
        ))}
      </div>
    ),
  ),
}));

describe('Toaster', () => {
  beforeEach(() => {
    const state = toastStore.getState();
    state.messages.forEach((msg) => {
      state.dismiss(msg.id);
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('renders with fixed positioning', () => {
    const { container } = render(<Toaster />);
    const wrapper = container.firstChild as HTMLElement;

    expect(wrapper).toHaveStyle({
      position: 'fixed',
      top: '16px',
      right: '16px',
      zIndex: '9999',
    });
  });

  it('displays toasts from store and handles dismiss', () => {
    const store = toastStore.getState();
    render(<Toaster />);

    act(() => {
      store.show({ title: 'Test Toast', description: 'Test Description' });
    });

    expect(screen.getByTestId('toast-title')).toHaveTextContent('Test Toast');
    expect(screen.getByTestId('toast-description')).toHaveTextContent('Test Description');

    const dismissButton = screen.getByTestId(/^dismiss-/);
    act(() => {
      dismissButton.click();
    });

    expect(screen.queryByTestId('toast-title')).not.toBeInTheDocument();
  });

  it('displays multiple toasts', () => {
    const store = toastStore.getState();
    render(<Toaster />);

    act(() => {
      store.show({ title: 'Toast 1' });
      store.show({ title: 'Toast 2' });
    });

    const titles = screen.getAllByTestId('toast-title');
    expect(titles).toHaveLength(2);
  });
});
