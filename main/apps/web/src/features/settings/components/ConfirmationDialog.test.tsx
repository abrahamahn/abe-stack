// main/apps/web/src/features/settings/components/ConfirmationDialog.test.tsx
/**
 * Tests for ConfirmationDialog component.
 */

import { act, render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ConfirmationDialog } from './ConfirmationDialog';

// ============================================================================
// Mocks
// ============================================================================

vi.mock('@bslt/ui', async () => {
  const actual = await vi.importActual('@bslt/ui');

  return {
    ...actual,
    Modal: {
      Root: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
        open ? <div data-testid="modal-root">{children}</div> : null,
      Header: ({ children }: { children: React.ReactNode }) => (
        <div data-testid="modal-header">{children}</div>
      ),
      Title: ({ children, className }: { children: React.ReactNode; className?: string }) => (
        <h2 data-testid="modal-title" className={className}>
          {children}
        </h2>
      ),
      Close: () => null,
      Body: ({ children }: { children: React.ReactNode }) => (
        <div data-testid="modal-body">{children}</div>
      ),
      Footer: ({ children }: { children: React.ReactNode }) => (
        <div data-testid="modal-footer">{children}</div>
      ),
    },
    Button: ({
      children,
      onClick,
      disabled,
      'data-testid': testId,
    }: {
      children: React.ReactNode;
      onClick?: () => void;
      disabled?: boolean;
      type?: string;
      variant?: string;
      className?: string;
      'data-testid'?: string;
    }) => (
      <button onClick={onClick} disabled={disabled} data-testid={testId}>
        {children}
      </button>
    ),
    Text: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  };
});

// ============================================================================
// Tests
// ============================================================================

describe('ConfirmationDialog', () => {
  const defaultProps = {
    open: true,
    title: 'Delete Account',
    description: 'This action cannot be undone.',
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
  };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should render nothing when not open', () => {
    render(<ConfirmationDialog {...defaultProps} open={false} />);
    expect(screen.queryByTestId('modal-root')).not.toBeInTheDocument();
  });

  it('should render title and description when open', () => {
    render(<ConfirmationDialog {...defaultProps} />);
    expect(screen.getByTestId('modal-title')).toHaveTextContent('Delete Account');
    expect(screen.getByText('This action cannot be undone.')).toBeInTheDocument();
  });

  it('should show countdown indicator initially', () => {
    render(<ConfirmationDialog {...defaultProps} countdownSeconds={3} />);
    expect(screen.getByTestId('countdown-indicator')).toBeInTheDocument();
    expect(screen.getByText('Please wait before confirming...')).toBeInTheDocument();
  });

  it('should disable confirm button during countdown', () => {
    render(<ConfirmationDialog {...defaultProps} countdownSeconds={3} />);
    const confirmButton = screen.getByTestId('confirm-button');
    expect(confirmButton).toBeDisabled();
    expect(confirmButton).toHaveTextContent('Confirm (3s)');
  });

  it('should enable confirm button after countdown completes', () => {
    render(<ConfirmationDialog {...defaultProps} countdownSeconds={2} />);

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(screen.getByTestId('confirm-button')).toHaveTextContent('Confirm (1s)');
    expect(screen.getByTestId('confirm-button')).toBeDisabled();

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(screen.getByTestId('confirm-button')).toHaveTextContent('Confirm');
    expect(screen.getByTestId('confirm-button')).not.toBeDisabled();
  });

  it('should call onConfirm when confirm button is clicked after countdown', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<ConfirmationDialog {...defaultProps} countdownSeconds={1} />);

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    await user.click(screen.getByTestId('confirm-button'));
    expect(defaultProps.onConfirm).toHaveBeenCalledTimes(1);
  });

  it('should call onCancel when cancel button is clicked', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<ConfirmationDialog {...defaultProps} />);

    const cancelButton = screen.getByText('Cancel');
    await user.click(cancelButton);

    expect(defaultProps.onCancel).toHaveBeenCalledTimes(1);
  });

  it('should show custom button labels', () => {
    render(
      <ConfirmationDialog
        {...defaultProps}
        confirmLabel="Delete Forever"
        cancelLabel="Keep It"
        countdownSeconds={0}
      />,
    );

    expect(screen.getByTestId('confirm-button')).toHaveTextContent('Delete Forever');
    expect(screen.getByText('Keep It')).toBeInTheDocument();
  });

  it('should show loading state', () => {
    render(<ConfirmationDialog {...defaultProps} countdownSeconds={0} isLoading />);
    expect(screen.getByTestId('confirm-button')).toHaveTextContent('Processing...');
    expect(screen.getByTestId('confirm-button')).toBeDisabled();
  });

  it('should reset countdown when reopened', () => {
    const { rerender } = render(<ConfirmationDialog {...defaultProps} countdownSeconds={3} />);

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    // Close
    rerender(<ConfirmationDialog {...defaultProps} countdownSeconds={3} open={false} />);

    // Reopen
    rerender(<ConfirmationDialog {...defaultProps} countdownSeconds={3} open />);

    expect(screen.getByTestId('confirm-button')).toHaveTextContent('Confirm (3s)');
  });
});
