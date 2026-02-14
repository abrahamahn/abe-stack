// main/apps/web/src/features/settings/components/ConsentPreferences.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import { ConsentPreferences } from './ConsentPreferences';

// Mock the hooks
vi.mock('../hooks/useConsent', () => ({
  useConsent: vi.fn(() => ({
    preferences: {
      analytics: true,
      marketing_email: false,
      third_party_sharing: null,
      profiling: false,
    },
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  })),
  useUpdateConsent: vi.fn(() => ({
    updateConsent: vi.fn().mockResolvedValue({
      preferences: {},
      updated: 1,
    }),
    isUpdating: false,
    error: null,
  })),
}));

// Import after mocking
const { useConsent, useUpdateConsent } = await import('../hooks/useConsent');

describe('ConsentPreferences', () => {
  it('should render loading state', () => {
    vi.mocked(useConsent).mockReturnValue({
      preferences: null,
      isLoading: true,
      error: null,
      refetch: vi.fn(),
    });

    render(<ConsentPreferences />);

    expect(screen.getByText(/Loading consent preferences.../i)).toBeInTheDocument();
  });

  it('should render consent categories with switches', () => {
    vi.mocked(useConsent).mockReturnValue({
      preferences: {
        analytics: true,
        marketing_email: false,
        third_party_sharing: null,
        profiling: false,
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<ConsentPreferences />);

    expect(screen.getByText(/Analytics tracking/i)).toBeInTheDocument();
    expect(screen.getByText(/Marketing communications/i)).toBeInTheDocument();
    expect(screen.getByText(/Third-party sharing/i)).toBeInTheDocument();
    expect(screen.getByText(/Profiling/i)).toBeInTheDocument();

    expect(screen.getByText(/Help us improve by sharing usage data/i)).toBeInTheDocument();
  });

  it('should toggle switch when clicked', async () => {
    vi.mocked(useConsent).mockReturnValue({
      preferences: {
        analytics: true,
        marketing_email: false,
        third_party_sharing: null,
        profiling: false,
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    const user = userEvent.setup();
    render(<ConsentPreferences />);

    const analyticsSwitch = screen.getByRole('switch', { name: /Analytics tracking/i });

    // Initial state should be checked (analytics: true)
    expect(analyticsSwitch).toHaveAttribute('aria-checked', 'true');

    await user.click(analyticsSwitch);

    // After click, should be unchecked
    expect(analyticsSwitch).toHaveAttribute('aria-checked', 'false');
  });

  it('should enable save button when changes are made', async () => {
    vi.mocked(useConsent).mockReturnValue({
      preferences: {
        analytics: true,
        marketing_email: false,
        third_party_sharing: null,
        profiling: false,
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    const user = userEvent.setup();
    render(<ConsentPreferences />);

    const saveButton = screen.getByRole('button', { name: /Save Preferences/i });

    // Initially disabled
    expect(saveButton).toBeDisabled();

    // Toggle a switch
    const analyticsSwitch = screen.getByRole('switch', { name: /Analytics tracking/i });
    await user.click(analyticsSwitch);

    // Now enabled
    expect(saveButton).not.toBeDisabled();
  });

  it('should call updateConsent when save button is clicked', async () => {
    const mockUpdateConsent = vi.fn().mockResolvedValue({
      preferences: {},
      updated: 1,
    });
    const mockRefetch = vi.fn();

    vi.mocked(useConsent).mockReturnValue({
      preferences: {
        analytics: true,
        marketing_email: false,
        third_party_sharing: null,
        profiling: false,
      },
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    vi.mocked(useUpdateConsent).mockReturnValue({
      updateConsent: mockUpdateConsent,
      isUpdating: false,
      error: null,
    });

    const user = userEvent.setup();
    render(<ConsentPreferences />);

    // Toggle analytics switch
    const analyticsSwitch = screen.getByRole('switch', { name: /Analytics tracking/i });
    await user.click(analyticsSwitch);

    // Click save
    const saveButton = screen.getByRole('button', { name: /Save Preferences/i });
    await user.click(saveButton);

    await waitFor(() => {
      expect(mockUpdateConsent).toHaveBeenCalledWith({
        analytics: false,
      });
      expect(mockRefetch).toHaveBeenCalled();
    });
  });

  it('should show error message when fetch fails', () => {
    vi.mocked(useConsent).mockReturnValue({
      preferences: null,
      isLoading: false,
      error: new Error('Failed to fetch preferences'),
      refetch: vi.fn(),
    });

    render(<ConsentPreferences />);

    expect(screen.getByText(/Failed to fetch preferences/i)).toBeInTheDocument();
  });

  it('should show error message when update fails', () => {
    vi.mocked(useConsent).mockReturnValue({
      preferences: {
        analytics: true,
        marketing_email: false,
        third_party_sharing: null,
        profiling: false,
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    vi.mocked(useUpdateConsent).mockReturnValue({
      updateConsent: vi.fn(),
      isUpdating: false,
      error: new Error('Failed to update preferences'),
    });

    render(<ConsentPreferences />);

    expect(screen.getByText(/Failed to update preferences/i)).toBeInTheDocument();
  });

  it('should show "Saving..." while update is in progress', async () => {
    let resolveUpdate: () => void;
    const updatePromise = new Promise<{
      preferences: {
        analytics: boolean | null;
        marketing_email: boolean | null;
        third_party_sharing: boolean | null;
        profiling: boolean | null;
      };
      updated: number;
    }>((resolve) => {
      resolveUpdate = () => {
        resolve({
          preferences: {
            analytics: false,
            marketing_email: false,
            third_party_sharing: false,
            profiling: false,
          },
          updated: 1,
        });
      };
    });

    const mockUpdateConsent = vi.fn(() => updatePromise);

    vi.mocked(useConsent).mockReturnValue({
      preferences: {
        analytics: true,
        marketing_email: false,
        third_party_sharing: null,
        profiling: false,
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    vi.mocked(useUpdateConsent).mockReturnValue({
      updateConsent: mockUpdateConsent,
      isUpdating: true,
      error: null,
    });

    render(<ConsentPreferences />);

    expect(screen.getByRole('button', { name: /Saving.../i })).toBeInTheDocument();

    // Resolve the promise
    resolveUpdate!();

    await waitFor(() => {
      // Button text should change back after update completes
      // (in real implementation, isUpdating would be set to false)
    });
  });

  it('should disable switches while saving', () => {
    vi.mocked(useConsent).mockReturnValue({
      preferences: {
        analytics: true,
        marketing_email: false,
        third_party_sharing: null,
        profiling: false,
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    vi.mocked(useUpdateConsent).mockReturnValue({
      updateConsent: vi.fn(),
      isUpdating: true,
      error: null,
    });

    render(<ConsentPreferences />);

    const analyticsSwitch = screen.getByRole('switch', { name: /Analytics tracking/i });
    expect(analyticsSwitch).toBeDisabled();
  });
});
