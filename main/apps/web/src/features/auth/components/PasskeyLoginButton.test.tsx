// main/apps/web/src/features/auth/components/PasskeyLoginButton.test.tsx
/**
 * PasskeyLoginButton Component Tests
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PasskeyLoginButton } from './PasskeyLoginButton';

// ============================================================================
// Mocks
// ============================================================================

const mockLogin = vi.fn();

const { mockUseLoginWithPasskey } = vi.hoisted(() => ({
  mockUseLoginWithPasskey: vi.fn(),
}));

vi.mock('../hooks/useWebauthn', () => ({
  useLoginWithPasskey: mockUseLoginWithPasskey,
}));

vi.mock('@app/ClientEnvironment', () => ({
  useClientEnvironment: () => ({
    config: { apiUrl: 'http://localhost:3000' },
  }),
}));

vi.mock('@bslt/react', () => ({
  useEnabledAuthStrategies: () => ({
    enabled: ['local', 'webauthn'],
    disabled: [],
    isLoading: false,
    error: null,
    refresh: vi.fn(),
  }),
}));

// ============================================================================
// Tests
// ============================================================================

describe('PasskeyLoginButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default: WebAuthn supported
    Object.defineProperty(window, 'PublicKeyCredential', {
      value: {},
      writable: true,
      configurable: true,
    });

    mockUseLoginWithPasskey.mockReturnValue({
      login: mockLogin,
      isLoading: false,
      error: null,
    });
  });

  it('renders when WebAuthn is supported', () => {
    render(<PasskeyLoginButton />);

    expect(screen.getByText('Sign in with Passkey')).toBeInTheDocument();
  });

  it('returns null when WebAuthn is not supported', () => {
    Object.defineProperty(window, 'PublicKeyCredential', {
      value: undefined,
      writable: true,
      configurable: true,
    });
    delete (window as unknown as Record<string, unknown>)['PublicKeyCredential'];

    const { container } = render(<PasskeyLoginButton />);

    expect(container.innerHTML).toBe('');
  });

  it('calls login on click', () => {
    render(<PasskeyLoginButton />);

    fireEvent.click(screen.getByText('Sign in with Passkey'));

    expect(mockLogin).toHaveBeenCalled();
  });

  it('shows loading state', () => {
    mockUseLoginWithPasskey.mockReturnValue({
      login: mockLogin,
      isLoading: true,
      error: null,
    });

    render(<PasskeyLoginButton />);

    expect(screen.getByText('Verifying...')).toBeInTheDocument();
  });

  it('disables button when loading', () => {
    mockUseLoginWithPasskey.mockReturnValue({
      login: mockLogin,
      isLoading: true,
      error: null,
    });

    render(<PasskeyLoginButton />);

    const button = screen.getByText('Verifying...').closest('button');
    expect(button).toBeDisabled();
  });

  it('disables button when disabled prop is true', () => {
    render(<PasskeyLoginButton disabled />);

    const button = screen.getByText('Sign in with Passkey').closest('button');
    expect(button).toBeDisabled();
  });

  it('shows error message', () => {
    mockUseLoginWithPasskey.mockReturnValue({
      login: mockLogin,
      isLoading: false,
      error: 'Authentication failed',
    });

    render(<PasskeyLoginButton />);

    expect(screen.getByText('Authentication failed')).toBeInTheDocument();
  });

  it('passes onSuccess to hook', () => {
    const onSuccess = vi.fn();
    render(<PasskeyLoginButton onSuccess={onSuccess} />);

    expect(mockUseLoginWithPasskey).toHaveBeenCalledWith(onSuccess);
  });
});
