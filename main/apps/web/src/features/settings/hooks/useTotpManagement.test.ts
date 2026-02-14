// main/apps/web/src/features/settings/hooks/useTotpManagement.test.ts
/**
 * Unit tests for useTotpManagement hook.
 *
 * Tests verify:
 * - Initial state transitions (loading → enabled/disabled)
 * - TOTP setup flow with secret and backup codes
 * - Enable/disable operations with verification codes
 * - Error handling for all operations
 * - State management and cleanup
 *
 * @complexity O(1) - All tests are unit tests with mocked dependencies
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

// ============================================================================
// Hoisted mocks - MUST use vi.hoisted to avoid reference issues
// ============================================================================

const mocks = vi.hoisted(() => ({
  mockApiClient: {
    totpStatus: vi.fn(),
    totpSetup: vi.fn(),
    totpEnable: vi.fn(),
    totpDisable: vi.fn(),
  },
}));

// ============================================================================
// Vi.mock calls - these reference hoisted mocks
// ============================================================================

vi.mock('@abe-stack/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@abe-stack/api')>();
  return {
    ...actual,
    getApiClient: () => mocks.mockApiClient,
  };
});

// ============================================================================
// Import after mocks are set up
// ============================================================================

import { useTotpManagement } from './useTotpManagement';

import type { TotpSetupResponse, TotpStatusResponse } from '@abe-stack/shared';

// ============================================================================
// Test Helpers
// ============================================================================

function createMockTotpSetupResponse(): TotpSetupResponse {
  return {
    secret: 'JBSWY3DPEHPK3PXP',
    otpauthUrl: 'otpauth://totp/Test:user@example.com?secret=JBSWY3DPEHPK3PXP&issuer=Test',
    backupCodes: ['code1-111111', 'code2-222222', 'code3-333333'],
  };
}

function createMockTotpStatusResponse(enabled: boolean): TotpStatusResponse {
  return {
    enabled,
  };
}

// ============================================================================
// Tests
// ============================================================================

describe('useTotpManagement', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Reset localStorage
    localStorage.clear();
    localStorage.setItem('accessToken', 'mock-token-abc123');

    // Set default env vars
    vi.stubEnv('VITE_API_URL', 'http://localhost:3000');

    // Reset api client mocks
    Object.values(mocks.mockApiClient).forEach((mock) => {
      if (typeof mock === 'function' && 'mockReset' in mock) {
        mock.mockReset();
      }
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('initial state', () => {
    it('should start with loading state', async () => {
      let resolveStatus: (value: TotpStatusResponse) => void;
      const statusPromise = new Promise<TotpStatusResponse>((resolve) => {
        resolveStatus = resolve;
      });
      mocks.mockApiClient.totpStatus.mockReturnValue(statusPromise);

      const { result } = renderHook(() => useTotpManagement());

      expect(result.current.state).toBe('loading');

      // Wait for isLoading to become true after effect fires
      await waitFor(() => {
        expect(result.current.isLoading).toBe(true);
      });

      expect(result.current.error).toBeNull();
      expect(result.current.setupData).toBeNull();

      // Clean up - resolve promise to avoid hanging
      act(() => {
        resolveStatus(createMockTotpStatusResponse(false));
      });
    });

    it('should transition to enabled after fetchStatus when TOTP is enabled', async () => {
      const mockStatus = createMockTotpStatusResponse(true);
      mocks.mockApiClient.totpStatus.mockResolvedValue(mockStatus);

      const { result } = renderHook(() => useTotpManagement());

      expect(result.current.state).toBe('loading');

      await waitFor(() => {
        expect(result.current.state).toBe('enabled');
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(mocks.mockApiClient.totpStatus).toHaveBeenCalledTimes(1);
    });

    it('should transition to disabled after fetchStatus when TOTP is disabled', async () => {
      const mockStatus = createMockTotpStatusResponse(false);
      mocks.mockApiClient.totpStatus.mockResolvedValue(mockStatus);

      const { result } = renderHook(() => useTotpManagement());

      expect(result.current.state).toBe('loading');

      await waitFor(() => {
        expect(result.current.state).toBe('disabled');
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(mocks.mockApiClient.totpStatus).toHaveBeenCalledTimes(1);
    });

    it('should provide all required functions', async () => {
      const mockStatus = createMockTotpStatusResponse(false);
      mocks.mockApiClient.totpStatus.mockResolvedValue(mockStatus);

      const { result } = renderHook(() => useTotpManagement());

      await waitFor(() => {
        expect(result.current.state).toBe('disabled');
      });

      expect(typeof result.current.beginSetup).toBe('function');
      expect(typeof result.current.enable).toBe('function');
      expect(typeof result.current.disable).toBe('function');
      expect(typeof result.current.refresh).toBe('function');
      expect(typeof result.current.cancelSetup).toBe('function');
    });
  });

  describe('fetchStatus error handling', () => {
    it('should set error and default to disabled when fetchStatus fails', async () => {
      const mockError = new Error('Network error');
      mocks.mockApiClient.totpStatus.mockRejectedValue(mockError);

      const { result } = renderHook(() => useTotpManagement());

      await waitFor(() => {
        expect(result.current.state).toBe('disabled');
      });

      expect(result.current.error).toBe('Network error');
      expect(result.current.isLoading).toBe(false);
    });

    it('should handle non-Error objects in fetchStatus rejection', async () => {
      mocks.mockApiClient.totpStatus.mockRejectedValue('String error');

      const { result } = renderHook(() => useTotpManagement());

      await waitFor(() => {
        expect(result.current.state).toBe('disabled');
      });

      expect(result.current.error).toBe('Failed to check 2FA status');
      expect(result.current.isLoading).toBe(false);
    });

    it('should set isLoading correctly during fetchStatus', async () => {
      let resolveStatus: (value: TotpStatusResponse) => void;
      const statusPromise = new Promise<TotpStatusResponse>((resolve) => {
        resolveStatus = resolve;
      });
      mocks.mockApiClient.totpStatus.mockReturnValue(statusPromise);

      const { result } = renderHook(() => useTotpManagement());

      // Initially loading
      await waitFor(() => {
        expect(result.current.isLoading).toBe(true);
      });

      // Resolve the promise
      act(() => {
        resolveStatus(createMockTotpStatusResponse(false));
      });

      // Should stop loading
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });
  });

  describe('beginSetup', () => {
    it('should call totpSetup and transition to setup-in-progress with setupData', async () => {
      const mockStatus = createMockTotpStatusResponse(false);
      mocks.mockApiClient.totpStatus.mockResolvedValue(mockStatus);

      const mockSetupData = createMockTotpSetupResponse();
      mocks.mockApiClient.totpSetup.mockResolvedValue(mockSetupData);

      const { result } = renderHook(() => useTotpManagement());

      await waitFor(() => {
        expect(result.current.state).toBe('disabled');
      });

      act(() => {
        void result.current.beginSetup();
      });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.state).toBe('setup-in-progress');
      });

      expect(result.current.setupData).toEqual(mockSetupData);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(mocks.mockApiClient.totpSetup).toHaveBeenCalledTimes(1);
    });

    it('should set error when totpSetup fails', async () => {
      const mockStatus = createMockTotpStatusResponse(false);
      mocks.mockApiClient.totpStatus.mockResolvedValue(mockStatus);

      const mockError = new Error('Setup failed');
      mocks.mockApiClient.totpSetup.mockRejectedValue(mockError);

      const { result } = renderHook(() => useTotpManagement());

      await waitFor(() => {
        expect(result.current.state).toBe('disabled');
      });

      act(() => {
        void result.current.beginSetup();
      });

      await waitFor(() => {
        expect(result.current.error).toBe('Setup failed');
      });

      expect(result.current.state).toBe('disabled');
      expect(result.current.setupData).toBeNull();
      expect(result.current.isLoading).toBe(false);
    });

    it('should handle non-Error objects in beginSetup rejection', async () => {
      const mockStatus = createMockTotpStatusResponse(false);
      mocks.mockApiClient.totpStatus.mockResolvedValue(mockStatus);

      mocks.mockApiClient.totpSetup.mockRejectedValue('String error');

      const { result } = renderHook(() => useTotpManagement());

      await waitFor(() => {
        expect(result.current.state).toBe('disabled');
      });

      act(() => {
        void result.current.beginSetup();
      });

      await waitFor(() => {
        expect(result.current.error).toBe('Failed to start 2FA setup');
      });

      expect(result.current.state).toBe('disabled');
    });

    it('should clear previous error when beginSetup starts', async () => {
      const mockStatus = createMockTotpStatusResponse(false);
      mocks.mockApiClient.totpStatus.mockResolvedValue(mockStatus);

      // First setup fails
      const mockError = new Error('First error');
      mocks.mockApiClient.totpSetup.mockRejectedValueOnce(mockError);

      const { result } = renderHook(() => useTotpManagement());

      await waitFor(() => {
        expect(result.current.state).toBe('disabled');
      });

      act(() => {
        void result.current.beginSetup();
      });

      await waitFor(() => {
        expect(result.current.error).toBe('First error');
      });

      // Second setup succeeds
      const mockSetupData = createMockTotpSetupResponse();
      mocks.mockApiClient.totpSetup.mockResolvedValueOnce(mockSetupData);

      act(() => {
        void result.current.beginSetup();
      });

      // Error should be cleared immediately when starting
      await waitFor(() => {
        expect(result.current.error).toBeNull();
      });

      await waitFor(() => {
        expect(result.current.state).toBe('setup-in-progress');
      });
    });
  });

  describe('enable', () => {
    it('should call totpEnable and transition to enabled, clearing setupData', async () => {
      const mockStatus = createMockTotpStatusResponse(false);
      mocks.mockApiClient.totpStatus.mockResolvedValue(mockStatus);

      const mockSetupData = createMockTotpSetupResponse();
      mocks.mockApiClient.totpSetup.mockResolvedValue(mockSetupData);

      const mockEnableResponse = { message: '2FA enabled successfully' };
      mocks.mockApiClient.totpEnable.mockResolvedValue(mockEnableResponse);

      const { result } = renderHook(() => useTotpManagement());

      await waitFor(() => {
        expect(result.current.state).toBe('disabled');
      });

      // Start setup first
      act(() => {
        void result.current.beginSetup();
      });

      await waitFor(() => {
        expect(result.current.state).toBe('setup-in-progress');
      });

      expect(result.current.setupData).toEqual(mockSetupData);

      // Enable with code
      act(() => {
        void result.current.enable('123456');
      });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.state).toBe('enabled');
      });

      expect(result.current.setupData).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(mocks.mockApiClient.totpEnable).toHaveBeenCalledWith({ code: '123456' });
    });

    it('should set error when totpEnable fails', async () => {
      const mockStatus = createMockTotpStatusResponse(false);
      mocks.mockApiClient.totpStatus.mockResolvedValue(mockStatus);

      const mockError = new Error('Invalid code');
      mocks.mockApiClient.totpEnable.mockRejectedValue(mockError);

      const { result } = renderHook(() => useTotpManagement());

      await waitFor(() => {
        expect(result.current.state).toBe('disabled');
      });

      act(() => {
        void result.current.enable('123456');
      });

      await waitFor(() => {
        expect(result.current.error).toBe('Invalid code');
      });

      expect(result.current.state).toBe('disabled');
      expect(result.current.isLoading).toBe(false);
    });

    it('should handle non-Error objects in enable rejection', async () => {
      const mockStatus = createMockTotpStatusResponse(false);
      mocks.mockApiClient.totpStatus.mockResolvedValue(mockStatus);

      mocks.mockApiClient.totpEnable.mockRejectedValue('String error');

      const { result } = renderHook(() => useTotpManagement());

      await waitFor(() => {
        expect(result.current.state).toBe('disabled');
      });

      act(() => {
        void result.current.enable('123456');
      });

      await waitFor(() => {
        expect(result.current.error).toBe('Failed to enable 2FA');
      });
    });

    it('should clear previous error when enable starts', async () => {
      const mockStatus = createMockTotpStatusResponse(false);
      mocks.mockApiClient.totpStatus.mockResolvedValue(mockStatus);

      // First enable fails
      const mockError = new Error('First error');
      mocks.mockApiClient.totpEnable.mockRejectedValueOnce(mockError);

      const { result } = renderHook(() => useTotpManagement());

      await waitFor(() => {
        expect(result.current.state).toBe('disabled');
      });

      act(() => {
        void result.current.enable('123456');
      });

      await waitFor(() => {
        expect(result.current.error).toBe('First error');
      });

      // Second enable succeeds
      const mockEnableResponse = { message: '2FA enabled successfully' };
      mocks.mockApiClient.totpEnable.mockResolvedValueOnce(mockEnableResponse);

      act(() => {
        void result.current.enable('123456');
      });

      // Error should be cleared immediately when starting
      await waitFor(() => {
        expect(result.current.error).toBeNull();
      });

      await waitFor(() => {
        expect(result.current.state).toBe('enabled');
      });
    });

    it('should not transition to enabled if response lacks message field', async () => {
      const mockStatus = createMockTotpStatusResponse(false);
      mocks.mockApiClient.totpStatus.mockResolvedValue(mockStatus);

      // Response without message field
      const mockEnableResponse = { success: true };
      mocks.mockApiClient.totpEnable.mockResolvedValue(mockEnableResponse);

      const { result } = renderHook(() => useTotpManagement());

      await waitFor(() => {
        expect(result.current.state).toBe('disabled');
      });

      act(() => {
        void result.current.enable('123456');
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // State should remain disabled because response doesn't have message field
      expect(result.current.state).toBe('disabled');
    });
  });

  describe('disable', () => {
    it('should call totpDisable and transition to disabled', async () => {
      const mockStatus = createMockTotpStatusResponse(true);
      mocks.mockApiClient.totpStatus.mockResolvedValue(mockStatus);

      mocks.mockApiClient.totpDisable.mockResolvedValue({ message: '2FA disabled' });

      const { result } = renderHook(() => useTotpManagement());

      await waitFor(() => {
        expect(result.current.state).toBe('enabled');
      });

      act(() => {
        void result.current.disable('123456');
      });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.state).toBe('disabled');
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(mocks.mockApiClient.totpDisable).toHaveBeenCalledWith({ code: '123456' });
    });

    it('should set error when totpDisable fails', async () => {
      const mockStatus = createMockTotpStatusResponse(true);
      mocks.mockApiClient.totpStatus.mockResolvedValue(mockStatus);

      const mockError = new Error('Invalid code');
      mocks.mockApiClient.totpDisable.mockRejectedValue(mockError);

      const { result } = renderHook(() => useTotpManagement());

      await waitFor(() => {
        expect(result.current.state).toBe('enabled');
      });

      act(() => {
        void result.current.disable('123456');
      });

      await waitFor(() => {
        expect(result.current.error).toBe('Invalid code');
      });

      expect(result.current.state).toBe('enabled');
      expect(result.current.isLoading).toBe(false);
    });

    it('should handle non-Error objects in disable rejection', async () => {
      const mockStatus = createMockTotpStatusResponse(true);
      mocks.mockApiClient.totpStatus.mockResolvedValue(mockStatus);

      mocks.mockApiClient.totpDisable.mockRejectedValue('String error');

      const { result } = renderHook(() => useTotpManagement());

      await waitFor(() => {
        expect(result.current.state).toBe('enabled');
      });

      act(() => {
        void result.current.disable('123456');
      });

      await waitFor(() => {
        expect(result.current.error).toBe('Failed to disable 2FA');
      });
    });

    it('should clear previous error when disable starts', async () => {
      const mockStatus = createMockTotpStatusResponse(true);
      mocks.mockApiClient.totpStatus.mockResolvedValue(mockStatus);

      // First disable fails
      const mockError = new Error('First error');
      mocks.mockApiClient.totpDisable.mockRejectedValueOnce(mockError);

      const { result } = renderHook(() => useTotpManagement());

      await waitFor(() => {
        expect(result.current.state).toBe('enabled');
      });

      act(() => {
        void result.current.disable('123456');
      });

      await waitFor(() => {
        expect(result.current.error).toBe('First error');
      });

      // Second disable succeeds
      mocks.mockApiClient.totpDisable.mockResolvedValueOnce({ message: 'Success' });

      act(() => {
        void result.current.disable('123456');
      });

      // Error should be cleared immediately when starting
      await waitFor(() => {
        expect(result.current.error).toBeNull();
      });

      await waitFor(() => {
        expect(result.current.state).toBe('disabled');
      });
    });
  });

  describe('cancelSetup', () => {
    it('should reset to disabled state and clear setupData and error', async () => {
      const mockStatus = createMockTotpStatusResponse(false);
      mocks.mockApiClient.totpStatus.mockResolvedValue(mockStatus);

      const mockSetupData = createMockTotpSetupResponse();
      mocks.mockApiClient.totpSetup.mockResolvedValue(mockSetupData);

      const { result } = renderHook(() => useTotpManagement());

      await waitFor(() => {
        expect(result.current.state).toBe('disabled');
      });

      // Start setup
      act(() => {
        void result.current.beginSetup();
      });

      await waitFor(() => {
        expect(result.current.state).toBe('setup-in-progress');
      });

      expect(result.current.setupData).toEqual(mockSetupData);

      // Cancel setup
      act(() => {
        result.current.cancelSetup();
      });

      expect(result.current.state).toBe('disabled');
      expect(result.current.setupData).toBeNull();
      expect(result.current.error).toBeNull();
    });

    it('should clear error when canceling setup after error', async () => {
      const mockStatus = createMockTotpStatusResponse(false);
      mocks.mockApiClient.totpStatus.mockResolvedValue(mockStatus);

      const mockError = new Error('Enable failed');
      mocks.mockApiClient.totpEnable.mockRejectedValue(mockError);

      const { result } = renderHook(() => useTotpManagement());

      await waitFor(() => {
        expect(result.current.state).toBe('disabled');
      });

      // Try to enable and fail
      act(() => {
        void result.current.enable('123456');
      });

      await waitFor(() => {
        expect(result.current.error).toBe('Enable failed');
      });

      // Cancel setup
      act(() => {
        result.current.cancelSetup();
      });

      expect(result.current.state).toBe('disabled');
      expect(result.current.error).toBeNull();
    });
  });

  describe('refresh', () => {
    it('should re-fetch status from server', async () => {
      const mockStatus = createMockTotpStatusResponse(false);
      mocks.mockApiClient.totpStatus.mockResolvedValue(mockStatus);

      const { result } = renderHook(() => useTotpManagement());

      await waitFor(() => {
        expect(result.current.state).toBe('disabled');
      });

      // Clear the initial call
      mocks.mockApiClient.totpStatus.mockClear();

      // Change the mock to return enabled
      const enabledStatus = createMockTotpStatusResponse(true);
      mocks.mockApiClient.totpStatus.mockResolvedValue(enabledStatus);

      act(() => {
        void result.current.refresh();
      });

      await waitFor(() => {
        expect(result.current.state).toBe('enabled');
      });

      expect(mocks.mockApiClient.totpStatus).toHaveBeenCalledTimes(1);
    });

    it('should handle errors during refresh', async () => {
      const mockStatus = createMockTotpStatusResponse(false);
      mocks.mockApiClient.totpStatus.mockResolvedValue(mockStatus);

      const { result } = renderHook(() => useTotpManagement());

      await waitFor(() => {
        expect(result.current.state).toBe('disabled');
      });

      // Make refresh fail
      const mockError = new Error('Refresh failed');
      mocks.mockApiClient.totpStatus.mockRejectedValue(mockError);

      act(() => {
        void result.current.refresh();
      });

      await waitFor(() => {
        expect(result.current.error).toBe('Refresh failed');
      });

      expect(result.current.state).toBe('disabled');
    });
  });

  describe('edge cases', () => {
    it('should handle empty verification code', async () => {
      const mockStatus = createMockTotpStatusResponse(false);
      mocks.mockApiClient.totpStatus.mockResolvedValue(mockStatus);

      mocks.mockApiClient.totpEnable.mockResolvedValue({ message: 'Success' });

      const { result } = renderHook(() => useTotpManagement());

      await waitFor(() => {
        expect(result.current.state).toBe('disabled');
      });

      act(() => {
        void result.current.enable('');
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mocks.mockApiClient.totpEnable).toHaveBeenCalledWith({ code: '' });
    });

    it('should handle very long verification code', async () => {
      const mockStatus = createMockTotpStatusResponse(false);
      mocks.mockApiClient.totpStatus.mockResolvedValue(mockStatus);

      mocks.mockApiClient.totpEnable.mockResolvedValue({ message: 'Success' });

      const { result } = renderHook(() => useTotpManagement());

      await waitFor(() => {
        expect(result.current.state).toBe('disabled');
      });

      const longCode = '1'.repeat(1000);
      act(() => {
        void result.current.enable(longCode);
      });

      await waitFor(() => {
        expect(result.current.state).toBe('enabled');
      });

      expect(mocks.mockApiClient.totpEnable).toHaveBeenCalledWith({ code: longCode });
    });

    it('should handle missing access token', async () => {
      localStorage.removeItem('accessToken');

      const mockStatus = createMockTotpStatusResponse(false);
      mocks.mockApiClient.totpStatus.mockResolvedValue(mockStatus);

      const { result } = renderHook(() => useTotpManagement());

      await waitFor(() => {
        expect(result.current.state).toBe('disabled');
      });

      expect(mocks.mockApiClient.totpStatus).toHaveBeenCalled();
    });

    it('should handle missing VITE_API_URL', async () => {
      vi.stubEnv('VITE_API_URL', undefined);

      const mockStatus = createMockTotpStatusResponse(false);
      mocks.mockApiClient.totpStatus.mockResolvedValue(mockStatus);

      const { result } = renderHook(() => useTotpManagement());

      await waitFor(() => {
        expect(result.current.state).toBe('disabled');
      });

      expect(mocks.mockApiClient.totpStatus).toHaveBeenCalled();
    });

    it('should handle backup codes in setup data', async () => {
      const mockStatus = createMockTotpStatusResponse(false);
      mocks.mockApiClient.totpStatus.mockResolvedValue(mockStatus);

      const mockSetupData = createMockTotpSetupResponse();
      mocks.mockApiClient.totpSetup.mockResolvedValue(mockSetupData);

      const { result } = renderHook(() => useTotpManagement());

      await waitFor(() => {
        expect(result.current.state).toBe('disabled');
      });

      act(() => {
        void result.current.beginSetup();
      });

      await waitFor(() => {
        expect(result.current.state).toBe('setup-in-progress');
      });

      expect(result.current.setupData?.backupCodes).toEqual([
        'code1-111111',
        'code2-222222',
        'code3-333333',
      ]);
      expect(result.current.setupData?.secret).toBe('JBSWY3DPEHPK3PXP');
      expect(result.current.setupData?.otpauthUrl).toContain('otpauth://totp/');
    });
  });

  describe('state transitions', () => {
    it('should transition through complete enable flow', async () => {
      const mockStatus = createMockTotpStatusResponse(false);
      mocks.mockApiClient.totpStatus.mockResolvedValue(mockStatus);

      const mockSetupData = createMockTotpSetupResponse();
      mocks.mockApiClient.totpSetup.mockResolvedValue(mockSetupData);

      const mockEnableResponse = { message: '2FA enabled successfully' };
      mocks.mockApiClient.totpEnable.mockResolvedValue(mockEnableResponse);

      const { result } = renderHook(() => useTotpManagement());

      // 1. Initial: loading → disabled
      expect(result.current.state).toBe('loading');

      await waitFor(() => {
        expect(result.current.state).toBe('disabled');
      });

      // 2. Begin setup: disabled → setup-in-progress
      act(() => {
        void result.current.beginSetup();
      });

      await waitFor(() => {
        expect(result.current.state).toBe('setup-in-progress');
      });

      // 3. Enable: setup-in-progress → enabled
      act(() => {
        void result.current.enable('123456');
      });

      await waitFor(() => {
        expect(result.current.state).toBe('enabled');
      });

      expect(result.current.setupData).toBeNull();
    });

    it('should transition through complete disable flow', async () => {
      const mockStatus = createMockTotpStatusResponse(true);
      mocks.mockApiClient.totpStatus.mockResolvedValue(mockStatus);

      mocks.mockApiClient.totpDisable.mockResolvedValue({ message: 'Success' });

      const { result } = renderHook(() => useTotpManagement());

      // 1. Initial: loading → enabled
      expect(result.current.state).toBe('loading');

      await waitFor(() => {
        expect(result.current.state).toBe('enabled');
      });

      // 2. Disable: enabled → disabled
      act(() => {
        void result.current.disable('123456');
      });

      await waitFor(() => {
        expect(result.current.state).toBe('disabled');
      });
    });

    it('should allow canceling setup and restarting', async () => {
      const mockStatus = createMockTotpStatusResponse(false);
      mocks.mockApiClient.totpStatus.mockResolvedValue(mockStatus);

      const mockSetupData = createMockTotpSetupResponse();
      mocks.mockApiClient.totpSetup.mockResolvedValue(mockSetupData);

      const { result } = renderHook(() => useTotpManagement());

      await waitFor(() => {
        expect(result.current.state).toBe('disabled');
      });

      // Start setup
      act(() => {
        void result.current.beginSetup();
      });

      await waitFor(() => {
        expect(result.current.state).toBe('setup-in-progress');
      });

      // Cancel
      act(() => {
        result.current.cancelSetup();
      });

      expect(result.current.state).toBe('disabled');
      expect(result.current.setupData).toBeNull();

      // Start again
      act(() => {
        void result.current.beginSetup();
      });

      await waitFor(() => {
        expect(result.current.state).toBe('setup-in-progress');
      });

      expect(result.current.setupData).toEqual(mockSetupData);
    });
  });
});
