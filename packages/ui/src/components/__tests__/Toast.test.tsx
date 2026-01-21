// packages/ui/src/components/__tests__/Toast.test.tsx
// packages/ui/src/elements/__tests__/Toast.test.tsx
/** @vitest-environment jsdom */
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Toast, ToastContainer } from '../Toast';

describe('Toast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('renders title and description', () => {
    render(<Toast message={{ id: 'test', title: 'Title', description: 'Description' }} />);

    expect(screen.getByText('Title')).toBeInTheDocument();
    expect(screen.getByText('Description')).toBeInTheDocument();
  });

  it('auto-dismisses after duration and calls onDismiss', () => {
    const onDismiss = vi.fn();
    render(
      <Toast message={{ id: 'toast-1', title: 'Test' }} duration={1000} onDismiss={onDismiss} />,
    );

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(onDismiss).toHaveBeenCalledWith('toast-1');
  });

  it('uses default duration of 3500ms', () => {
    const onDismiss = vi.fn();
    render(<Toast message={{ id: 'toast-1' }} onDismiss={onDismiss} />);

    act(() => {
      vi.advanceTimersByTime(3499);
    });
    expect(onDismiss).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(onDismiss).toHaveBeenCalledWith('toast-1');
  });

  it('clears timer on unmount', () => {
    const onDismiss = vi.fn();
    const { unmount } = render(
      <Toast message={{ id: 'toast-1' }} duration={1000} onDismiss={onDismiss} />,
    );

    unmount();

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(onDismiss).not.toHaveBeenCalled();
  });
});

describe('ToastContainer', () => {
  it('renders multiple messages', () => {
    render(
      <ToastContainer
        messages={[
          { id: 'toast-1', title: 'Toast 1' },
          { id: 'toast-2', title: 'Toast 2' },
        ]}
      />,
    );

    expect(screen.getByText('Toast 1')).toBeInTheDocument();
    expect(screen.getByText('Toast 2')).toBeInTheDocument();
  });

  it('renders empty container when no messages', () => {
    const { container } = render(<ToastContainer messages={[]} />);

    const toastContainer = container.querySelector('.toast');
    expect(toastContainer).toBeInTheDocument();
    expect(toastContainer?.children.length).toBe(0);
  });
});
