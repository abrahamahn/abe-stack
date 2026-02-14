// main/client/ui/src/components/Toast.test.tsx
/** @vitest-environment jsdom */
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Toast, ToastContainer } from './Toast';

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

  it('renders with data-tone attribute defaulting to info', () => {
    const { container } = render(<Toast message={{ id: 'toast-1', title: 'Info toast' }} />);

    const card = container.querySelector('.toast-card');
    expect(card).toHaveAttribute('data-tone', 'info');
  });

  it('renders with specified tone', () => {
    const { container } = render(
      <Toast message={{ id: 'toast-1', title: 'Error', tone: 'danger' }} />,
    );

    const card = container.querySelector('.toast-card');
    expect(card).toHaveAttribute('data-tone', 'danger');
  });

  it('renders success tone', () => {
    const { container } = render(
      <Toast message={{ id: 'toast-1', title: 'Saved', tone: 'success' }} />,
    );

    const card = container.querySelector('.toast-card');
    expect(card).toHaveAttribute('data-tone', 'success');
  });

  it('renders warning tone', () => {
    const { container } = render(
      <Toast message={{ id: 'toast-1', title: 'Warning', tone: 'warning' }} />,
    );

    const card = container.querySelector('.toast-card');
    expect(card).toHaveAttribute('data-tone', 'warning');
  });

  it('renders dismiss button when onDismiss is provided', () => {
    const onDismiss = vi.fn();
    render(<Toast message={{ id: 'toast-1', title: 'Test' }} onDismiss={onDismiss} />);

    const dismissBtn = screen.getByRole('button', { name: 'Dismiss notification' });
    expect(dismissBtn).toBeInTheDocument();
  });

  it('does not render dismiss button when onDismiss is not provided', () => {
    render(<Toast message={{ id: 'toast-1', title: 'Test' }} />);

    expect(screen.queryByRole('button', { name: 'Dismiss notification' })).not.toBeInTheDocument();
  });

  it('calls onDismiss when dismiss button is clicked', () => {
    const onDismiss = vi.fn();
    render(<Toast message={{ id: 'toast-1', title: 'Test' }} onDismiss={onDismiss} />);

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss notification' }));
    expect(onDismiss).toHaveBeenCalledWith('toast-1');
  });

  it('has role="status" for screen readers', () => {
    render(<Toast message={{ id: 'toast-1', title: 'Status toast' }} />);

    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders action button when action is provided', () => {
    const onClick = vi.fn();
    render(
      <Toast message={{ id: 'toast-1', title: 'Undone', action: { label: 'Redo', onClick } }} />,
    );

    expect(screen.getByText('Redo')).toBeInTheDocument();
  });

  it('calls action onClick when action button is clicked', () => {
    const onClick = vi.fn();
    render(
      <Toast message={{ id: 'toast-1', title: 'Undone', action: { label: 'Redo', onClick } }} />,
    );

    fireEvent.click(screen.getByText('Redo'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('does not render action button when action is undefined', () => {
    render(<Toast message={{ id: 'toast-1', title: 'No action' }} />);

    expect(screen.queryByText('Redo')).not.toBeInTheDocument();
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

  it('has aria-live attribute for screen reader announcements', () => {
    const { container } = render(<ToastContainer messages={[]} />);

    const toastContainer = container.querySelector('.toast');
    expect(toastContainer).toHaveAttribute('aria-live', 'polite');
    expect(toastContainer).toHaveAttribute('aria-relevant', 'additions');
  });
});
