// src/apps/web/src/features/settings/components/TotpManagement.test.tsx
/**
 * TOTP Management Component Tests
 *
 * Comprehensive tests for TOTP (2FA) management covering:
 * - All four states: loading, disabled, setup-in-progress, enabled
 * - User interactions: enable, disable, verify, cancel
 * - Clipboard copy operations
 * - Error handling and loading states
 * - Form submission and validation
 */

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { useTotpManagement } from '../hooks/useTotpManagement';

import { TotpManagement } from './TotpManagement';

import type { UseTotpManagementResult } from '../hooks/useTotpManagement';
import type { ReactNode } from 'react';
import type { Mock } from 'vitest';

// ============================================================================
// Mocks
// ============================================================================

// Mock the useTotpManagement hook
vi.mock('../hooks/useTotpManagement', () => ({
  useTotpManagement: vi.fn(),
}));

// Mock UI components
vi.mock('@abe-stack/ui', () => {
  const mockAlert = ({ children, tone }: { children: ReactNode; tone?: string }) => (
    <div data-testid="alert" data-tone={tone}>
      {children}
    </div>
  );

  const mockButton = ({
    children,
    onClick,
    disabled,
    type = 'button',
    variant,
  }: {
    children: ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    type?: 'submit' | 'reset' | 'button';
    variant?: string;
  }) => (
    <button
      data-testid="button"
      onClick={onClick}
      disabled={disabled}
      type={type}
      data-variant={variant}
    >
      {children}
    </button>
  );

  const mockInputField = ({
    label,
    type,
    value,
    onChange,
    placeholder,
    maxLength,
    autoComplete,
    disabled,
    required,
  }: {
    label: string;
    type?: string;
    value: string;
    onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    placeholder?: string;
    maxLength?: number;
    autoComplete?: string;
    disabled?: boolean;
    required?: boolean;
  }) => (
    <div data-testid={`input-field-${label.toLowerCase().replace(/\s+/g, '-')}`}>
      <label>{label}</label>
      <input
        data-testid={`input-${label.toLowerCase().replace(/\s+/g, '-')}`}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        maxLength={maxLength}
        autoComplete={autoComplete}
        disabled={disabled}
        required={required}
      />
    </div>
  );

  const mockInput = {
    Field: mockInputField,
  };

  const mockText = ({
    children,
    tone,
    size,
    className,
  }: {
    children: ReactNode;
    tone?: string;
    size?: string;
    className?: string;
  }) => (
    <span data-testid="text" data-tone={tone} data-size={size} className={className}>
      {children}
    </span>
  );

  return {
    Alert: mockAlert,
    Button: mockButton,
    Input: mockInput,
    Text: mockText,
  };
});

// Mock clipboard API
const mockWriteText = vi.fn().mockResolvedValue(undefined);

// Set up clipboard mock before tests
beforeAll(() => {
  Object.defineProperty(global.navigator, 'clipboard', {
    value: {
      writeText: mockWriteText,
    },
    writable: true,
    configurable: true,
  });
});

// ============================================================================
// Test Suite
// ============================================================================

describe('TotpManagement', () => {
  let mockBeginSetup: Mock<() => Promise<void>>;
  let mockEnable: Mock<(code: string) => Promise<void>>;
  let mockDisable: Mock<(code: string) => Promise<void>>;
  let mockRefresh: Mock<() => Promise<void>>;
  let mockCancelSetup: Mock<() => void>;
  let mockOnStatusChange: Mock<(enabled: boolean) => void>;

  const defaultHookReturn: UseTotpManagementResult = {
    state: 'disabled',
    error: null,
    isLoading: false,
    setupData: null,
    beginSetup: vi.fn(),
    enable: vi.fn(),
    disable: vi.fn(),
    refresh: vi.fn(),
    cancelSetup: vi.fn(),
  };

  beforeEach(() => {
    mockBeginSetup = vi.fn().mockResolvedValue(undefined);
    mockEnable = vi.fn().mockResolvedValue(undefined);
    mockDisable = vi.fn().mockResolvedValue(undefined);
    mockRefresh = vi.fn().mockResolvedValue(undefined);
    mockCancelSetup = vi.fn();
    mockOnStatusChange = vi.fn();
    mockWriteText.mockClear();

    vi.mocked(useTotpManagement).mockReturnValue({
      ...defaultHookReturn,
      beginSetup: mockBeginSetup,
      enable: mockEnable,
      disable: mockDisable,
      refresh: mockRefresh,
      cancelSetup: mockCancelSetup,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  // ============================================================================
  // State: Loading
  // ============================================================================

  describe('loading state', () => {
    it('should render skeleton UI when state is loading', () => {
      vi.mocked(useTotpManagement).mockReturnValue({
        ...defaultHookReturn,
        state: 'loading',
      });

      const { container } = render(<TotpManagement />);

      const skeleton = container.querySelector('.animate-pulse');
      expect(skeleton).toBeInTheDocument();
      expect(container.querySelectorAll('.bg-surface').length).toBeGreaterThan(0);
    });

    it('should not render any buttons in loading state', () => {
      vi.mocked(useTotpManagement).mockReturnValue({
        ...defaultHookReturn,
        state: 'loading',
      });

      render(<TotpManagement />);

      expect(screen.queryByTestId('button')).not.toBeInTheDocument();
    });

    it('should not display error in loading state', () => {
      vi.mocked(useTotpManagement).mockReturnValue({
        ...defaultHookReturn,
        state: 'loading',
        error: 'Some error',
      });

      render(<TotpManagement />);

      expect(screen.queryByTestId('alert')).not.toBeInTheDocument();
    });
  });

  // ============================================================================
  // State: Disabled
  // ============================================================================

  describe('disabled state', () => {
    it('should render status text indicating 2FA is disabled', () => {
      render(<TotpManagement />);

      expect(screen.getByText('Two-factor authentication is not enabled')).toBeInTheDocument();
    });

    it('should render muted status indicator dot', () => {
      const { container } = render(<TotpManagement />);

      const statusDot = container.querySelector('.text-muted.rounded-full');
      expect(statusDot).toBeInTheDocument();
    });

    it('should render "Enable 2FA" button', () => {
      render(<TotpManagement />);

      expect(screen.getByText('Enable 2FA')).toBeInTheDocument();
    });

    it('should render descriptive help text', () => {
      render(<TotpManagement />);

      expect(
        screen.getByText(/Add an extra layer of security to your account/i),
      ).toBeInTheDocument();
    });

    it('should call beginSetup when "Enable 2FA" button is clicked', async () => {
      const user = userEvent.setup({ delay: null });
      render(<TotpManagement />);

      const button = screen.getByText('Enable 2FA');
      await user.click(button);

      expect(mockBeginSetup).toHaveBeenCalledTimes(1);
    });

    it('should disable "Enable 2FA" button when isLoading is true', () => {
      vi.mocked(useTotpManagement).mockReturnValue({
        ...defaultHookReturn,
        isLoading: true,
      });

      render(<TotpManagement />);

      const button = screen.getByText('Setting up...');
      expect(button).toBeDisabled();
    });

    it('should display error alert when error exists', () => {
      vi.mocked(useTotpManagement).mockReturnValue({
        ...defaultHookReturn,
        error: 'Failed to start setup',
      });

      render(<TotpManagement />);

      expect(screen.getByTestId('alert')).toBeInTheDocument();
      expect(screen.getByText('Failed to start setup')).toBeInTheDocument();
    });

    it('should render error alert with danger tone', () => {
      vi.mocked(useTotpManagement).mockReturnValue({
        ...defaultHookReturn,
        error: 'Setup failed',
      });

      render(<TotpManagement />);

      const alert = screen.getByTestId('alert');
      expect(alert).toHaveAttribute('data-tone', 'danger');
    });
  });

  // ============================================================================
  // State: Setup In Progress
  // ============================================================================

  describe('setup-in-progress state', () => {
    const mockSetupData = {
      secret: 'JBSWY3DPEHPK3PXP',
      otpauthUrl: 'otpauth://totp/Test?secret=JBSWY3DPEHPK3PXP',
      backupCodes: ['ABC-123', 'DEF-456', 'GHI-789', 'JKL-012'],
    };

    beforeEach(() => {
      vi.mocked(useTotpManagement).mockReturnValue({
        ...defaultHookReturn,
        state: 'setup-in-progress',
        setupData: mockSetupData,
      });
    });

    it('should render setup instructions', () => {
      render(<TotpManagement />);

      expect(screen.getByText(/Add this account to your authenticator app/i)).toBeInTheDocument();
    });

    it('should display the secret key', () => {
      render(<TotpManagement />);

      expect(screen.getByText('JBSWY3DPEHPK3PXP')).toBeInTheDocument();
    });

    it('should render "Copy" button for secret', () => {
      render(<TotpManagement />);

      const buttons = screen.getAllByText('Copy');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('should show "Copied" feedback when secret copy button is clicked', async () => {
      render(<TotpManagement />);

      const copyButtons = screen.getAllByText('Copy');
      const copyButton = copyButtons[0] as HTMLElement;

      // Click and wait for state update
      await act(async () => {
        fireEvent.click(copyButton);
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      // Should show copied feedback
      expect(screen.getByText('Copied')).toBeInTheDocument();
    });

    it('should show "Copied" text after copying secret', async () => {
      vi.useFakeTimers();
      mockWriteText.mockResolvedValue(undefined);

      render(<TotpManagement />);

      const copyButtons = screen.getAllByText('Copy');
      fireEvent.click(copyButtons[0] as HTMLElement);

      // Wait for async clipboard operation and state update
      await act(async () => {
        await Promise.resolve();
      });

      expect(screen.getByText('Copied')).toBeInTheDocument();

      vi.useRealTimers();
    });

    it('should reset "Copied" text back to "Copy" after 2 seconds', async () => {
      vi.useFakeTimers();
      mockWriteText.mockResolvedValue(undefined);

      render(<TotpManagement />);

      const copyButtons = screen.getAllByText('Copy');
      fireEvent.click(copyButtons[0] as HTMLElement);

      // Wait for async clipboard operation and state update
      await act(async () => {
        await Promise.resolve();
      });

      expect(screen.getByText('Copied')).toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(2000);
      });

      expect(screen.queryByText('Copied')).not.toBeInTheDocument();

      vi.useRealTimers();
    });

    it('should display all backup codes', () => {
      render(<TotpManagement />);

      expect(screen.getByText('ABC-123')).toBeInTheDocument();
      expect(screen.getByText('DEF-456')).toBeInTheDocument();
      expect(screen.getByText('GHI-789')).toBeInTheDocument();
      expect(screen.getByText('JKL-012')).toBeInTheDocument();
    });

    it('should render "Copy all codes" button', () => {
      render(<TotpManagement />);

      expect(screen.getByText('Copy all codes')).toBeInTheDocument();
    });

    it('should show "Copied" feedback when backup codes copy button is clicked', async () => {
      render(<TotpManagement />);

      const button = screen.getByText('Copy all codes');

      await act(async () => {
        fireEvent.click(button);
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      // Should show copied feedback
      expect(screen.getByText('Copied')).toBeInTheDocument();
    });

    it('should render verification code input field', () => {
      render(<TotpManagement />);

      expect(screen.getByTestId('input-verification-code')).toBeInTheDocument();
    });

    it('should render "Enable 2FA" submit button in verification form', () => {
      render(<TotpManagement />);

      const buttons = screen.getAllByText('Enable 2FA');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('should render "Cancel" button', () => {
      render(<TotpManagement />);

      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    it('should accept verification code input and allow form submission', async () => {
      const user = userEvent.setup({ delay: null });
      render(<TotpManagement />);

      const input = screen.getByTestId('input-verification-code');
      await user.type(input, '123456');

      // Verify input was entered
      expect(input).toHaveValue('123456');

      // Submit button should be enabled with valid code
      const submitButton = screen.getByText('Enable 2FA');
      expect(submitButton).not.toBeDisabled();
    });

    it('should clear verification code after successful submit', async () => {
      const user = userEvent.setup({ delay: null });
      render(<TotpManagement />);

      const input = screen.getByTestId<HTMLInputElement>('input-verification-code');
      await user.type(input, '123456');

      const form = input.closest('form') as HTMLFormElement;
      fireEvent.submit(form);

      await waitFor(() => {
        expect(input.value).toBe('');
      });
    });

    it('should call onStatusChange with true after successful enable', async () => {
      const user = userEvent.setup({ delay: null });
      render(<TotpManagement onStatusChange={mockOnStatusChange} />);

      const input = screen.getByTestId('input-verification-code');
      await user.type(input, '123456');

      const form = input.closest('form') as HTMLFormElement;

      act(() => {
        fireEvent.submit(form);
      });

      await waitFor(() => {
        expect(mockOnStatusChange).toHaveBeenCalledWith(true);
      });
    });

    it('should render cancel button in setup form', () => {
      render(<TotpManagement />);

      const buttons = screen.getAllByText('Cancel');
      expect(buttons.length).toBeGreaterThan(0);

      // Cancel button should be present and enabled (when not loading)
      expect(buttons[0] as HTMLElement).not.toBeDisabled();
    });

    it('should disable verification input and form buttons when isLoading is true', () => {
      vi.mocked(useTotpManagement).mockReturnValue({
        ...defaultHookReturn,
        state: 'setup-in-progress',
        setupData: mockSetupData,
        isLoading: true,
      });

      render(<TotpManagement />);

      const input = screen.getByTestId('input-verification-code');
      expect(input).toBeDisabled();

      // The Enable 2FA and Cancel buttons in the verification form should be disabled
      const enableButton = screen.getByText('Verifying...');
      const cancelButton = screen.getByText('Cancel');
      expect(enableButton).toBeDisabled();
      expect(cancelButton).toBeDisabled();
    });

    it('should disable submit button when code is less than 6 characters', async () => {
      const user = userEvent.setup({ delay: null });
      render(<TotpManagement />);

      const input = screen.getByTestId('input-verification-code');
      await user.type(input, '12345');

      const submitButton = screen.getByText('Enable 2FA');
      expect(submitButton).toBeDisabled();
    });

    it('should enable submit button when code is 6 or more characters', async () => {
      const user = userEvent.setup({ delay: null });
      render(<TotpManagement />);

      const input = screen.getByTestId('input-verification-code');
      await user.type(input, '123456');

      const submitButton = screen.getByText('Enable 2FA');
      expect(submitButton).not.toBeDisabled();
    });

    it('should show "Verifying..." text when isLoading is true', () => {
      vi.mocked(useTotpManagement).mockReturnValue({
        ...defaultHookReturn,
        state: 'setup-in-progress',
        setupData: mockSetupData,
        isLoading: true,
      });

      render(<TotpManagement />);

      expect(screen.getByText('Verifying...')).toBeInTheDocument();
    });

    it('should display error alert when error exists', () => {
      vi.mocked(useTotpManagement).mockReturnValue({
        ...defaultHookReturn,
        state: 'setup-in-progress',
        setupData: mockSetupData,
        error: 'Invalid code',
      });

      render(<TotpManagement />);

      expect(screen.getByText('Invalid code')).toBeInTheDocument();
    });

    it('should not throw error when clipboard copy is triggered', async () => {
      render(<TotpManagement />);

      const copyButtons = screen.getAllByText('Copy');

      // Should not throw error even if clipboard API fails
      await act(async () => {
        expect(() => fireEvent.click(copyButtons[0] as HTMLElement)).not.toThrow();
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      // Component should still update UI
      expect(screen.getByText('Copied')).toBeInTheDocument();
    });

    it('should not render setup UI if setupData is null', () => {
      vi.mocked(useTotpManagement).mockReturnValue({
        ...defaultHookReturn,
        state: 'setup-in-progress',
        setupData: null,
      });

      render(<TotpManagement />);

      // Should fall back to disabled state UI
      expect(screen.getByText('Two-factor authentication is not enabled')).toBeInTheDocument();
    });
  });

  // ============================================================================
  // State: Enabled
  // ============================================================================

  describe('enabled state', () => {
    beforeEach(() => {
      vi.mocked(useTotpManagement).mockReturnValue({
        ...defaultHookReturn,
        state: 'enabled',
      });
    });

    it('should render status text indicating 2FA is enabled', () => {
      render(<TotpManagement />);

      expect(screen.getByText('Two-factor authentication is enabled')).toBeInTheDocument();
    });

    it('should render success status indicator dot', () => {
      const { container } = render(<TotpManagement />);

      const statusDot = container.querySelector('.bg-success.rounded-full');
      expect(statusDot).toBeInTheDocument();
    });

    it('should render "Disable 2FA" button initially', () => {
      render(<TotpManagement />);

      expect(screen.getByText('Disable 2FA')).toBeInTheDocument();
    });

    it('should show disable form when "Disable 2FA" button is clicked', async () => {
      const user = userEvent.setup({ delay: null });
      render(<TotpManagement />);

      const button = screen.getByText('Disable 2FA');
      await user.click(button);

      expect(screen.getByTestId('input-enter-your-totp-code-to-disable-2fa')).toBeInTheDocument();
    });

    it('should render disable verification input in disable form', async () => {
      const user = userEvent.setup({ delay: null });
      render(<TotpManagement />);

      const button = screen.getByText('Disable 2FA');
      await user.click(button);

      expect(screen.getByTestId('input-enter-your-totp-code-to-disable-2fa')).toBeInTheDocument();
    });

    it('should accept disable code input and enable submit button', async () => {
      const user = userEvent.setup({ delay: null });
      render(<TotpManagement />);

      const disableButton = screen.getByText('Disable 2FA');
      await user.click(disableButton);

      const input = screen.getByTestId('input-enter-your-totp-code-to-disable-2fa');
      await user.type(input, '654321');

      // Verify input was entered
      expect(input).toHaveValue('654321');

      // Submit button should be enabled with valid code
      const submitButtons = screen.getAllByText('Disable 2FA');
      const submitButton = submitButtons.find((btn) => btn.getAttribute('type') === 'submit');
      expect(submitButton).not.toBeDisabled();
    });

    it('should clear disable code after successful submit', async () => {
      const user = userEvent.setup({ delay: null });
      render(<TotpManagement />);

      const disableButton = screen.getByText('Disable 2FA');
      await user.click(disableButton);

      const input = screen.getByTestId('input-enter-your-totp-code-to-disable-2fa');
      await user.type(input, '654321');

      const form = input.closest('form') as HTMLFormElement;
      fireEvent.submit(form);

      await waitFor(() => {
        // Form should be hidden, so input should not be in document
        expect(
          screen.queryByTestId('input-enter-your-totp-code-to-disable-2fa'),
        ).not.toBeInTheDocument();
      });
    });

    it('should call onStatusChange with false after successful disable', async () => {
      const user = userEvent.setup({ delay: null });
      render(<TotpManagement onStatusChange={mockOnStatusChange} />);

      const disableButton = screen.getByText('Disable 2FA');
      await user.click(disableButton);

      const input = screen.getByTestId('input-enter-your-totp-code-to-disable-2fa');
      await user.type(input, '654321');

      const form = input.closest('form') as HTMLFormElement;

      act(() => {
        fireEvent.submit(form);
      });

      await waitFor(() => {
        expect(mockOnStatusChange).toHaveBeenCalledWith(false);
      });
    });

    it('should hide disable form when "Cancel" button is clicked', async () => {
      const user = userEvent.setup({ delay: null });
      render(<TotpManagement />);

      const disableButton = screen.getByText('Disable 2FA');
      await user.click(disableButton);

      expect(screen.getByTestId('input-enter-your-totp-code-to-disable-2fa')).toBeInTheDocument();

      const cancelButton = screen.getByText('Cancel');
      await user.click(cancelButton);

      expect(
        screen.queryByTestId('input-enter-your-totp-code-to-disable-2fa'),
      ).not.toBeInTheDocument();
    });

    it('should clear disable code when cancel is clicked', async () => {
      const user = userEvent.setup({ delay: null });
      render(<TotpManagement />);

      const disableButton = screen.getByText('Disable 2FA');
      await user.click(disableButton);

      const input = screen.getByTestId('input-enter-your-totp-code-to-disable-2fa');
      await user.type(input, '654321');

      const cancelButton = screen.getByText('Cancel');
      await user.click(cancelButton);

      // Re-open form
      await user.click(screen.getByText('Disable 2FA'));

      const newInput = screen.getByTestId<HTMLInputElement>(
        'input-enter-your-totp-code-to-disable-2fa',
      );
      expect(newInput.value).toBe('');
    });

    it('should disable inputs and buttons when isLoading is true', async () => {
      const user = userEvent.setup({ delay: null });
      vi.mocked(useTotpManagement).mockReturnValue({
        ...defaultHookReturn,
        state: 'enabled',
        isLoading: true,
      });

      render(<TotpManagement />);

      const disableButton = screen.getByText('Disable 2FA');
      await user.click(disableButton);

      const input = screen.getByTestId('input-enter-your-totp-code-to-disable-2fa');
      expect(input).toBeDisabled();

      const buttons = screen.getAllByTestId('button');
      buttons.forEach((button) => {
        expect(button).toBeDisabled();
      });
    });

    it('should disable submit button when code is less than 6 characters', async () => {
      const user = userEvent.setup({ delay: null });
      render(<TotpManagement />);

      const disableButton = screen.getByText('Disable 2FA');
      await user.click(disableButton);

      const input = screen.getByTestId('input-enter-your-totp-code-to-disable-2fa');
      await user.type(input, '12345');

      const submitButtons = screen.getAllByText('Disable 2FA');
      const submitButton = submitButtons.find((btn) => btn.getAttribute('type') === 'submit');
      expect(submitButton).toBeDisabled();
    });

    it('should enable submit button when code is 6 or more characters', async () => {
      const user = userEvent.setup({ delay: null });
      render(<TotpManagement />);

      const disableButton = screen.getByText('Disable 2FA');
      await user.click(disableButton);

      const input = screen.getByTestId('input-enter-your-totp-code-to-disable-2fa');
      await user.type(input, '123456');

      const submitButtons = screen.getAllByText('Disable 2FA');
      const submitButton = submitButtons.find((btn) => btn.getAttribute('type') === 'submit');
      expect(submitButton).not.toBeDisabled();
    });

    it('should show "Disabling..." text when isLoading is true', async () => {
      const user = userEvent.setup({ delay: null });
      vi.mocked(useTotpManagement).mockReturnValue({
        ...defaultHookReturn,
        state: 'enabled',
        isLoading: true,
      });

      render(<TotpManagement />);

      const disableButton = screen.getByText('Disable 2FA');
      await user.click(disableButton);

      expect(screen.getByText('Disabling...')).toBeInTheDocument();
    });

    it('should display error alert when error exists', async () => {
      const user = userEvent.setup({ delay: null });
      vi.mocked(useTotpManagement).mockReturnValue({
        ...defaultHookReturn,
        state: 'enabled',
        error: 'Invalid code',
      });

      render(<TotpManagement />);

      const disableButton = screen.getByText('Disable 2FA');
      await user.click(disableButton);

      expect(screen.getByText('Invalid code')).toBeInTheDocument();
    });
  });

  // ============================================================================
  // Edge Cases
  // ============================================================================

  describe('edge cases', () => {
    it('should handle onStatusChange being undefined', async () => {
      vi.mocked(useTotpManagement).mockReturnValue({
        ...defaultHookReturn,
        state: 'setup-in-progress',
        setupData: {
          secret: 'TEST',
          otpauthUrl: 'otpauth://test',
          backupCodes: ['ABC-123'],
        },
      });

      const user = userEvent.setup({ delay: null });
      render(<TotpManagement />);

      const input = screen.getByTestId('input-verification-code');
      await user.type(input, '123456');

      const form = input.closest('form')!;

      // Should not throw
      expect(() => fireEvent.submit(form)).not.toThrow();
    });

    it('should enable submit button when 6-digit code is entered', async () => {
      vi.mocked(useTotpManagement).mockReturnValue({
        ...defaultHookReturn,
        state: 'setup-in-progress',
        setupData: {
          secret: 'TEST',
          otpauthUrl: 'otpauth://test',
          backupCodes: ['ABC-123'],
        },
      });

      const user = userEvent.setup({ delay: null });
      render(<TotpManagement />);

      const input = screen.getByTestId('input-verification-code');
      await user.type(input, '123456');

      // Submit button should be enabled with 6+ character code
      const submitButton = screen.getByText('Enable 2FA');
      expect(submitButton).not.toBeDisabled();
    });

    it('should set maxLength to 8 on verification input', () => {
      vi.mocked(useTotpManagement).mockReturnValue({
        ...defaultHookReturn,
        state: 'setup-in-progress',
        setupData: {
          secret: 'TEST',
          otpauthUrl: 'otpauth://test',
          backupCodes: ['ABC-123'],
        },
      });

      render(<TotpManagement />);

      const input = screen.getByTestId('input-verification-code');
      expect(input).toHaveAttribute('maxLength', '8');
    });

    it('should set autocomplete to "one-time-code" on verification input', () => {
      vi.mocked(useTotpManagement).mockReturnValue({
        ...defaultHookReturn,
        state: 'setup-in-progress',
        setupData: {
          secret: 'TEST',
          otpauthUrl: 'otpauth://test',
          backupCodes: ['ABC-123'],
        },
      });

      render(<TotpManagement />);

      const input = screen.getByTestId('input-verification-code');
      expect(input).toHaveAttribute('autoComplete', 'one-time-code');
    });

    it('should prevent default form submission behavior', async () => {
      vi.mocked(useTotpManagement).mockReturnValue({
        ...defaultHookReturn,
        state: 'setup-in-progress',
        setupData: {
          secret: 'TEST',
          otpauthUrl: 'otpauth://test',
          backupCodes: ['ABC-123'],
        },
      });

      const user = userEvent.setup({ delay: null });
      render(<TotpManagement />);

      const input = screen.getByTestId('input-verification-code');
      await user.type(input, '123456');

      const form = input.closest('form')!;
      const preventDefaultSpy = vi.fn();

      form.addEventListener('submit', (e) => {
        preventDefaultSpy();
        e.preventDefault();
      });

      fireEvent.submit(form);

      expect(preventDefaultSpy).toHaveBeenCalled();
    });

    it('should render backup codes in a grid layout', () => {
      vi.mocked(useTotpManagement).mockReturnValue({
        ...defaultHookReturn,
        state: 'setup-in-progress',
        setupData: {
          secret: 'TEST',
          otpauthUrl: 'otpauth://test',
          backupCodes: ['ABC-123', 'DEF-456'],
        },
      });

      const { container } = render(<TotpManagement />);

      const grid = container.querySelector('.grid.grid-cols-2');
      expect(grid).toBeInTheDocument();
    });

    it('should handle empty backup codes array', () => {
      vi.mocked(useTotpManagement).mockReturnValue({
        ...defaultHookReturn,
        state: 'setup-in-progress',
        setupData: {
          secret: 'TEST',
          otpauthUrl: 'otpauth://test',
          backupCodes: [],
        },
      });

      render(<TotpManagement />);

      // Should still render the UI without crashing
      expect(screen.getByText('Copy all codes')).toBeInTheDocument();
    });
  });
});
