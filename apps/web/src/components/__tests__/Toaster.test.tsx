// apps/web/src/components/__tests__/Toaster.test.tsx
/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { act } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { toastStore } from '../../stores/toastStore';
import { Toaster } from '../Toaster';

// Mock the ToastContainer from UI package
vi.mock('@abe-stack/ui', () => ({
  ToastContainer: vi.fn(({ messages, onDismiss }) => (
    <div data-testid="toast-container">
      {messages.map((msg: { id: string; title?: string; description?: string }) => (
        <div key={msg.id} data-testid={`toast-${msg.id}`}>
          {msg.title && <div data-testid="toast-title">{msg.title}</div>}
          {msg.description && <div data-testid="toast-description">{msg.description}</div>}
          <button onClick={() => onDismiss(msg.id)} data-testid={`dismiss-${msg.id}`}>
            Dismiss
          </button>
        </div>
      ))}
    </div>
  )),
}));

describe('Toaster', () => {
  beforeEach(() => {
    // Clear toast store before each test
    const store = toastStore.getState();
    act(() => {
      while (store.messages.length > 0) {
        store.dismiss(store.messages[0].id);
      }
    });
  });

  describe('Rendering', () => {
    it('should render without crashing', () => {
      render(<Toaster />);
      expect(screen.getByTestId('toast-container')).toBeInTheDocument();
    });

    it('should render with fixed positioning', () => {
      const { container } = render(<Toaster />);
      const wrapper = container.firstChild as HTMLElement;

      expect(wrapper).toHaveStyle({
        position: 'fixed',
        top: '16px',
        right: '16px',
        zIndex: '9999',
      });
    });
  });

  describe('Toast Messages Integration', () => {
    it('should display toast when message is shown', () => {
      const store = toastStore.getState();
      render(<Toaster />);

      act(() => {
        store.show({ title: 'Test Toast', description: 'Test Description' });
      });

      expect(screen.getByTestId('toast-title')).toHaveTextContent('Test Toast');
      expect(screen.getByTestId('toast-description')).toHaveTextContent('Test Description');
    });

    it('should display multiple toasts', () => {
      const store = toastStore.getState();
      render(<Toaster />);

      act(() => {
        store.show({ title: 'Toast 1' });
        store.show({ title: 'Toast 2' });
      });

      const titles = screen.getAllByTestId('toast-title');
      expect(titles.length).toBeGreaterThanOrEqual(2);
    });

    it('should handle dismiss functionality', () => {
      const store = toastStore.getState();
      render(<Toaster />);

      act(() => {
        store.show({ title: 'Dismissible Toast' });
      });

      const dismissButton = screen.getByTestId(/^dismiss-/);
      
      act(() => {
        dismissButton.click();
      });

      expect(screen.queryByTestId('toast-title')).not.toBeInTheDocument();
    });
  });

  describe('Component Unmounting', () => {
    it('should handle unmounting gracefully', () => {
      const { unmount } = render(<Toaster />);
      expect(() => unmount()).not.toThrow();
    });
  });
});
