// src/apps/web/src/features/settings/components/PhoneManagement.test.tsx
/**
 * PhoneManagement Component Tests
 *
 * Tests for phone number management covering:
 * - Idle state: add phone number
 * - Verify state: enter verification code
 * - Verified state: show status and remove option
 * - Error handling and loading states
 */

import { usePhone } from '@abe-stack/react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PhoneManagement } from './PhoneManagement';

import type { PhoneState } from '@abe-stack/react';
import type { User } from '@abe-stack/shared';
import type { ReactNode } from 'react';

// ============================================================================
// Mocks
// ============================================================================

vi.mock('@abe-stack/react', () => ({
  usePhone: vi.fn(),
}));

vi.mock('@abe-stack/ui', () => {
  const mockAlert = ({
    children,
    variant,
    className,
  }: {
    children: ReactNode;
    variant?: string;
    className?: string;
  }) => (
    <div data-testid="alert" data-variant={variant} className={className}>
      {children}
    </div>
  );

  const mockButton = ({
    children,
    onClick,
    disabled,
    variant,
    size,
    type = 'button',
  }: {
    children: ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    variant?: string;
    size?: string;
    type?: 'button' | 'submit' | 'reset';
  }) => (
    <button
      data-testid="button"
      onClick={onClick}
      disabled={disabled}
      data-variant={variant}
      data-size={size}
      type={type}
    >
      {children}
    </button>
  );

  const mockCard = ({ children, className }: { children: ReactNode; className?: string }) => (
    <div data-testid="card" className={className}>
      {children}
    </div>
  );

  const mockInput = ({
    type,
    placeholder,
    value,
    onChange,
    maxLength,
  }: {
    type?: string;
    placeholder?: string;
    value: string;
    onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    maxLength?: number;
  }) => (
    <input
      data-testid="input"
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      maxLength={maxLength}
    />
  );

  const mockText = ({
    children,
    tone,
    size,
    weight,
    className,
  }: {
    children: ReactNode;
    tone?: string;
    size?: string;
    weight?: string;
    className?: string;
  }) => (
    <span
      data-testid="text"
      data-tone={tone}
      data-size={size}
      data-weight={weight}
      className={className}
    >
      {children}
    </span>
  );

  return {
    Alert: mockAlert,
    Button: mockButton,
    Card: mockCard,
    Input: mockInput,
    Text: mockText,
  };
});

// ============================================================================
// Test Helpers
// ============================================================================

function createMockUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1' as const,
    email: 'test@example.com',
    username: 'testuser',
    firstName: 'Test',
    lastName: 'User',
    role: 'user',
    avatarUrl: null,
    phone: null,
    phoneVerified: false,
    totpEnabled: false,
    emailVerified: true,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  } as unknown as User;
}

const defaultHookReturn: PhoneState = {
  isLoading: false,
  error: null,
  setPhone: vi.fn().mockResolvedValue(undefined),
  verifyPhone: vi.fn().mockResolvedValue(undefined),
  removePhone: vi.fn().mockResolvedValue(undefined),
};

// ============================================================================
// Tests
// ============================================================================

describe('PhoneManagement', () => {
  let mockSetPhone: ReturnType<typeof vi.fn<(phone: string) => Promise<{ message: string }>>>;
  let mockVerifyPhone: ReturnType<typeof vi.fn<(code: string) => Promise<{ verified: true }>>>;
  let mockRemovePhone: ReturnType<typeof vi.fn<() => Promise<void>>>;
  let mockOnStatusChange: ReturnType<typeof vi.fn<() => void>>;

  beforeEach(() => {
    mockSetPhone = vi
      .fn<(phone: string) => Promise<{ message: string }>>()
      .mockResolvedValue({ message: 'ok' });
    mockVerifyPhone = vi
      .fn<(code: string) => Promise<{ verified: true }>>()
      .mockResolvedValue({ verified: true });
    mockRemovePhone = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);
    mockOnStatusChange = vi.fn<() => void>();

    vi.mocked(usePhone).mockReturnValue({
      ...defaultHookReturn,
      setPhone: mockSetPhone,
      verifyPhone: mockVerifyPhone,
      removePhone: mockRemovePhone,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // --------------------------------------------------------------------------
  // Idle State (No Phone)
  // --------------------------------------------------------------------------

  describe('idle state', () => {
    it('should render phone number input and send button', () => {
      render(<PhoneManagement user={createMockUser()} baseUrl="" />);

      expect(screen.getByText('SMS Two-Factor Authentication')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('+1 555 123 4567')).toBeInTheDocument();
      expect(screen.getByText('Send Code')).toBeInTheDocument();
    });

    it('should render descriptive text about SMS 2FA', () => {
      render(<PhoneManagement user={createMockUser()} baseUrl="" />);

      expect(
        screen.getByText(/Add a phone number to receive SMS verification/),
      ).toBeInTheDocument();
    });

    it('should disable send button when phone input is empty', () => {
      render(<PhoneManagement user={createMockUser()} baseUrl="" />);

      const sendButton = screen.getByText('Send Code');
      expect(sendButton).toBeDisabled();
    });

    it('should enable send button when phone input has value', async () => {
      const user = userEvent.setup({ delay: null });
      render(<PhoneManagement user={createMockUser()} baseUrl="" />);

      const input = screen.getByPlaceholderText('+1 555 123 4567');
      await user.type(input, '+15551234567');

      const sendButton = screen.getByText('Send Code');
      expect(sendButton).not.toBeDisabled();
    });

    it('should call setPhone when Send Code is clicked', async () => {
      const user = userEvent.setup({ delay: null });
      render(<PhoneManagement user={createMockUser()} baseUrl="" />);

      const input = screen.getByPlaceholderText('+1 555 123 4567');
      await user.type(input, '+15551234567');

      const sendButton = screen.getByText('Send Code');
      fireEvent.click(sendButton);

      expect(mockSetPhone).toHaveBeenCalledWith('+15551234567');
    });

    it('should transition to verify step after successful setPhone', async () => {
      const user = userEvent.setup({ delay: null });
      render(<PhoneManagement user={createMockUser()} baseUrl="" />);

      const input = screen.getByPlaceholderText('+1 555 123 4567');
      await user.type(input, '+15551234567');

      fireEvent.click(screen.getByText('Send Code'));

      // Wait for async operation to complete and state to update
      await vi.waitFor(() => {
        expect(screen.getByText('Enter verification code')).toBeInTheDocument();
      });
    });

    it('should display error when setPhone fails', async () => {
      mockSetPhone.mockRejectedValue(new Error('Invalid phone number'));
      const user = userEvent.setup({ delay: null });
      render(<PhoneManagement user={createMockUser()} baseUrl="" />);

      const input = screen.getByPlaceholderText('+1 555 123 4567');
      await user.type(input, 'bad');

      fireEvent.click(screen.getByText('Send Code'));

      await vi.waitFor(() => {
        expect(screen.getByText('Invalid phone number')).toBeInTheDocument();
      });
    });

    it('should disable send button when loading', () => {
      vi.mocked(usePhone).mockReturnValue({
        ...defaultHookReturn,
        isLoading: true,
      });

      render(<PhoneManagement user={createMockUser()} baseUrl="" />);

      const sendButton = screen.getByText('Send Code');
      expect(sendButton).toBeDisabled();
    });
  });

  // --------------------------------------------------------------------------
  // Verify State
  // --------------------------------------------------------------------------

  describe('verify state', () => {
    async function enterVerifyState(): Promise<void> {
      const user = userEvent.setup({ delay: null });
      render(
        <PhoneManagement user={createMockUser()} baseUrl="" onStatusChange={mockOnStatusChange} />,
      );

      const input = screen.getByPlaceholderText('+1 555 123 4567');
      await user.type(input, '+15551234567');
      fireEvent.click(screen.getByText('Send Code'));

      await vi.waitFor(() => {
        expect(screen.getByText('Enter verification code')).toBeInTheDocument();
      });
    }

    it('should show verification code input', async () => {
      await enterVerifyState();

      expect(screen.getByPlaceholderText('6-digit code')).toBeInTheDocument();
    });

    it('should show verify button', async () => {
      await enterVerifyState();

      expect(screen.getByText('Verify')).toBeInTheDocument();
    });

    it('should disable verify button when code is too short', async () => {
      await enterVerifyState();

      const verifyButton = screen.getByText('Verify');
      expect(verifyButton).toBeDisabled();
    });

    it('should call verifyPhone when verify button is clicked', async () => {
      await enterVerifyState();

      const codeInput = screen.getByPlaceholderText('6-digit code');
      const user = userEvent.setup({ delay: null });
      await user.type(codeInput, '123456');

      fireEvent.click(screen.getByText('Verify'));

      expect(mockVerifyPhone).toHaveBeenCalledWith('123456');
    });

    it('should call onStatusChange after successful verification', async () => {
      await enterVerifyState();

      const codeInput = screen.getByPlaceholderText('6-digit code');
      const user = userEvent.setup({ delay: null });
      await user.type(codeInput, '123456');

      fireEvent.click(screen.getByText('Verify'));

      await vi.waitFor(() => {
        expect(mockOnStatusChange).toHaveBeenCalled();
      });
    });

    it('should display error when verification fails', async () => {
      mockVerifyPhone.mockRejectedValue(new Error('Invalid code'));
      await enterVerifyState();

      const codeInput = screen.getByPlaceholderText('6-digit code');
      const user = userEvent.setup({ delay: null });
      await user.type(codeInput, '000000');

      fireEvent.click(screen.getByText('Verify'));

      await vi.waitFor(() => {
        expect(screen.getByText('Invalid code')).toBeInTheDocument();
      });
    });
  });

  // --------------------------------------------------------------------------
  // Verified State (Phone Already Set)
  // --------------------------------------------------------------------------

  describe('verified state', () => {
    const verifiedUser = createMockUser({
      phone: '+15551234567',
      phoneVerified: true,
    });

    it('should display masked phone number', () => {
      render(<PhoneManagement user={verifiedUser} baseUrl="" />);

      expect(screen.getByText('***4567')).toBeInTheDocument();
    });

    it('should display "Verified" badge', () => {
      render(<PhoneManagement user={verifiedUser} baseUrl="" />);

      expect(screen.getByText('Verified')).toBeInTheDocument();
    });

    it('should display "Phone Number" label', () => {
      render(<PhoneManagement user={verifiedUser} baseUrl="" />);

      expect(screen.getByText('Phone Number')).toBeInTheDocument();
    });

    it('should render remove button', () => {
      render(<PhoneManagement user={verifiedUser} baseUrl="" />);

      expect(screen.getByText('Remove')).toBeInTheDocument();
    });

    it('should call removePhone when Remove is clicked', () => {
      render(
        <PhoneManagement user={verifiedUser} baseUrl="" onStatusChange={mockOnStatusChange} />,
      );

      fireEvent.click(screen.getByText('Remove'));

      expect(mockRemovePhone).toHaveBeenCalled();
    });

    it('should disable remove button when loading', () => {
      vi.mocked(usePhone).mockReturnValue({
        ...defaultHookReturn,
        isLoading: true,
      });

      render(<PhoneManagement user={verifiedUser} baseUrl="" />);

      expect(screen.getByText('Remove')).toBeDisabled();
    });

    it('should display error from hook', () => {
      vi.mocked(usePhone).mockReturnValue({
        ...defaultHookReturn,
        error: new Error('Server error'),
      });

      render(<PhoneManagement user={verifiedUser} baseUrl="" />);

      expect(screen.getByText('Server error')).toBeInTheDocument();
    });
  });
});
