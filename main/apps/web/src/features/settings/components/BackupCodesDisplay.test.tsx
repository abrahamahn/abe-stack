// main/apps/web/src/features/settings/components/BackupCodesDisplay.test.tsx
/**
 * Tests for BackupCodesDisplay component.
 */

import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// ============================================================================
// Mocks
// ============================================================================

vi.mock('../hooks/useBackupCodes', () => ({
  useBackupCodes: vi.fn(),
}));

import { useBackupCodes } from '../hooks/useBackupCodes';

import { BackupCodesDisplay } from './BackupCodesDisplay';

import type { UseBackupCodesResult } from '../hooks/useBackupCodes';

// ============================================================================
// Helpers
// ============================================================================

function createMockHookReturn(overrides: Partial<UseBackupCodesResult> = {}): UseBackupCodesResult {
  return {
    status: { remaining: 8, total: 10 },
    isLoading: false,
    isRegenerating: false,
    newCodes: null,
    error: null,
    refresh: vi.fn(),
    regenerate: vi.fn(),
    dismissCodes: vi.fn(),
    ...overrides,
  };
}

// ============================================================================
// Tests
// ============================================================================

describe('BackupCodesDisplay', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('loading state', () => {
    it('should render loading skeleton', () => {
      vi.mocked(useBackupCodes).mockReturnValue(
        createMockHookReturn({ isLoading: true, status: null }),
      );

      const { container } = render(<BackupCodesDisplay />);
      expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
    });
  });

  describe('status display', () => {
    it('should show remaining codes count', () => {
      vi.mocked(useBackupCodes).mockReturnValue(createMockHookReturn());

      render(<BackupCodesDisplay />);
      expect(screen.getByTestId('backup-codes-status')).toHaveTextContent(
        '8 of 10 codes remaining',
      );
    });

    it('should show warning when codes are low', () => {
      vi.mocked(useBackupCodes).mockReturnValue(
        createMockHookReturn({ status: { remaining: 2, total: 10 } }),
      );

      render(<BackupCodesDisplay />);
      expect(
        screen.getByText('Running low on backup codes. Consider regenerating.'),
      ).toBeInTheDocument();
    });

    it('should show urgent message when no codes remain', () => {
      vi.mocked(useBackupCodes).mockReturnValue(
        createMockHookReturn({ status: { remaining: 0, total: 10 } }),
      );

      render(<BackupCodesDisplay />);
      expect(
        screen.getByText('All codes have been used. Generate new codes immediately.'),
      ).toBeInTheDocument();
    });

    it('should show healthy message when plenty of codes remain', () => {
      vi.mocked(useBackupCodes).mockReturnValue(
        createMockHookReturn({ status: { remaining: 8, total: 10 } }),
      );

      render(<BackupCodesDisplay />);
      expect(
        screen.getByText('You have backup codes available for account recovery.'),
      ).toBeInTheDocument();
    });
  });

  describe('regenerate flow', () => {
    it('should show regenerate button initially', () => {
      vi.mocked(useBackupCodes).mockReturnValue(createMockHookReturn());

      render(<BackupCodesDisplay />);
      expect(screen.getByTestId('regenerate-button')).toBeInTheDocument();
    });

    it('should show confirmation form when regenerate is clicked', async () => {
      const user = userEvent.setup();
      vi.mocked(useBackupCodes).mockReturnValue(createMockHookReturn());

      render(<BackupCodesDisplay />);

      await user.click(screen.getByTestId('regenerate-button'));

      expect(screen.getByText(/Enter your TOTP code/)).toBeInTheDocument();
      expect(screen.getByTestId('confirm-regenerate-button')).toBeDisabled();
    });

    it('should enable submit when code is entered', async () => {
      const user = userEvent.setup();
      vi.mocked(useBackupCodes).mockReturnValue(createMockHookReturn());

      render(<BackupCodesDisplay />);

      await user.click(screen.getByTestId('regenerate-button'));
      await user.type(screen.getByTestId('confirm-code-input'), '123456');

      expect(screen.getByTestId('confirm-regenerate-button')).not.toBeDisabled();
    });
  });

  describe('new codes display', () => {
    it('should display new codes after regeneration', () => {
      const newCodes = ['ABC-DEF', 'GHI-JKL', 'MNO-PQR', 'STU-VWX'];

      vi.mocked(useBackupCodes).mockReturnValue(createMockHookReturn({ newCodes }));

      render(<BackupCodesDisplay />);

      expect(screen.getByTestId('new-codes-display')).toBeInTheDocument();
      expect(
        screen.getByText('Save these backup codes now. They will not be shown again.'),
      ).toBeInTheDocument();
      expect(screen.getByText('ABC-DEF')).toBeInTheDocument();
      expect(screen.getByText('GHI-JKL')).toBeInTheDocument();
    });

    it('should call dismissCodes when dismiss button is clicked', async () => {
      const user = userEvent.setup();
      const mockDismiss = vi.fn();

      vi.mocked(useBackupCodes).mockReturnValue(
        createMockHookReturn({
          newCodes: ['ABC-DEF'],
          dismissCodes: mockDismiss,
        }),
      );

      render(<BackupCodesDisplay />);

      await user.click(screen.getByTestId('dismiss-codes-button'));
      expect(mockDismiss).toHaveBeenCalledTimes(1);
    });

    it('should copy codes to clipboard', async () => {
      const user = userEvent.setup();
      const mockClipboard = vi.fn().mockResolvedValue(undefined);
      Object.assign(navigator, {
        clipboard: { writeText: mockClipboard },
      });

      vi.mocked(useBackupCodes).mockReturnValue(
        createMockHookReturn({
          newCodes: ['ABC-DEF', 'GHI-JKL'],
        }),
      );

      render(<BackupCodesDisplay />);

      await user.click(screen.getByTestId('copy-codes-button'));

      await waitFor(() => {
        expect(mockClipboard).toHaveBeenCalledWith('ABC-DEF\nGHI-JKL');
      });
    });
  });

  describe('error handling', () => {
    it('should display error message', () => {
      vi.mocked(useBackupCodes).mockReturnValue(
        createMockHookReturn({ error: 'Failed to load backup codes' }),
      );

      render(<BackupCodesDisplay />);
      expect(screen.getByText('Failed to load backup codes')).toBeInTheDocument();
    });
  });
});
