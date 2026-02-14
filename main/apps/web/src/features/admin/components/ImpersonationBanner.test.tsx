// main/apps/web/src/features/admin/components/ImpersonationBanner.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import { ImpersonationBanner } from './ImpersonationBanner';

// Mock the useImpersonation hook
vi.mock('../hooks/useImpersonation', () => ({
  useImpersonation: vi.fn(() => ({
    isImpersonating: false,
    targetEmail: null,
    endImpersonation: vi.fn(),
    startImpersonation: vi.fn(),
  })),
}));

// Import after mocking so we can manipulate the mock
const { useImpersonation } = await import('../hooks/useImpersonation');

describe('ImpersonationBanner', () => {
  it('should not render when not impersonating', () => {
    vi.mocked(useImpersonation).mockReturnValue({
      isImpersonating: false,
      targetEmail: null,
      endImpersonation: vi.fn(),
      startImpersonation: vi.fn(),
    });

    const { container } = render(<ImpersonationBanner />);

    expect(container.firstChild).toBeNull();
  });

  it('should render banner when impersonating', () => {
    vi.mocked(useImpersonation).mockReturnValue({
      isImpersonating: true,
      targetEmail: 'target@example.com',
      endImpersonation: vi.fn(),
      startImpersonation: vi.fn(),
    });

    render(<ImpersonationBanner />);

    expect(screen.getByText(/Viewing as target@example.com/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /End Session/i })).toBeInTheDocument();
  });

  it('should call endImpersonation when End Session button is clicked', async () => {
    const mockEndImpersonation = vi.fn().mockResolvedValue(undefined);
    vi.mocked(useImpersonation).mockReturnValue({
      isImpersonating: true,
      targetEmail: 'target@example.com',
      endImpersonation: mockEndImpersonation,
      startImpersonation: vi.fn(),
    });

    const user = userEvent.setup();
    render(<ImpersonationBanner />);

    const endButton = screen.getByRole('button', { name: /End Session/i });
    await user.click(endButton);

    await waitFor(() => {
      expect(mockEndImpersonation).toHaveBeenCalledTimes(1);
    });
  });

  it('should show "Ending..." text while ending session', async () => {
    let resolveEnd: () => void;
    const endPromise = new Promise<void>((resolve) => {
      resolveEnd = resolve;
    });

    const mockEndImpersonation = vi.fn(() => endPromise);
    vi.mocked(useImpersonation).mockReturnValue({
      isImpersonating: true,
      targetEmail: 'target@example.com',
      endImpersonation: mockEndImpersonation,
      startImpersonation: vi.fn(),
    });

    const user = userEvent.setup();
    render(<ImpersonationBanner />);

    const endButton = screen.getByRole('button', { name: /End Session/i });
    await user.click(endButton);

    expect(screen.getByRole('button', { name: /Ending.../i })).toBeInTheDocument();
    expect(endButton).toBeDisabled();

    // Resolve the promise
    resolveEnd!();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /End Session/i })).toBeInTheDocument();
    });
  });

  it('should handle error when ending session fails', async () => {
    const mockEndImpersonation = vi.fn().mockRejectedValue(new Error('Network error'));
    vi.mocked(useImpersonation).mockReturnValue({
      isImpersonating: true,
      targetEmail: 'target@example.com',
      endImpersonation: mockEndImpersonation,
      startImpersonation: vi.fn(),
    });

    const user = userEvent.setup();
    render(<ImpersonationBanner />);

    const endButton = screen.getByRole('button', { name: /End Session/i });
    await user.click(endButton);

    // Button should be re-enabled after error (error is silently caught)
    await waitFor(() => {
      expect(endButton).not.toBeDisabled();
    });

    expect(mockEndImpersonation).toHaveBeenCalledTimes(1);
  });

  it('should show "unknown user" if targetEmail is null', () => {
    vi.mocked(useImpersonation).mockReturnValue({
      isImpersonating: true,
      targetEmail: null,
      endImpersonation: vi.fn(),
      startImpersonation: vi.fn(),
    });

    render(<ImpersonationBanner />);

    expect(screen.getByText(/Viewing as unknown user/i)).toBeInTheDocument();
  });
});
