// main/apps/web/src/features/settings/components/PasskeyManagement.test.tsx
/**
 * PasskeyManagement Component Tests
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi, beforeEach } from 'vitest';

import { PasskeyManagement } from './PasskeyManagement';

import type { PasskeyListItem } from '@abe-stack/shared';

// ============================================================================
// Mocks
// ============================================================================

const mockRefetch = vi.fn();
const mockRename = vi.fn();
const mockRemove = vi.fn();
const mockRegister = vi.fn();

const { mockUsePasskeys, mockUseRegisterPasskey } = vi.hoisted(() => ({
  mockUsePasskeys: vi.fn(),
  mockUseRegisterPasskey: vi.fn(),
}));

vi.mock('../../auth/hooks/useWebauthn', () => ({
  usePasskeys: mockUsePasskeys,
  useRegisterPasskey: mockUseRegisterPasskey,
}));

vi.mock('@abe-stack/shared', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@abe-stack/shared')>();
  return {
    ...actual,
    formatDateTime: (iso: string | null) => (iso !== null ? iso.slice(0, 10) : ''),
  };
});

// ============================================================================
// Test Data
// ============================================================================

const mockPasskey: PasskeyListItem = {
  id: 'pk-1',
  name: 'My Passkey',
  deviceType: 'multiDevice',
  backedUp: true,
  createdAt: '2024-01-15T00:00:00Z',
  lastUsedAt: '2024-06-15T00:00:00Z',
};

const mockPasskey2: PasskeyListItem = {
  id: 'pk-2',
  name: 'Work Key',
  deviceType: 'singleDevice',
  backedUp: false,
  createdAt: '2024-03-01T00:00:00Z',
  lastUsedAt: null,
};

// ============================================================================
// Tests
// ============================================================================

describe('PasskeyManagement', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default: WebAuthn supported
    Object.defineProperty(window, 'PublicKeyCredential', {
      value: {},
      writable: true,
      configurable: true,
    });

    mockUsePasskeys.mockReturnValue({
      passkeys: [mockPasskey, mockPasskey2],
      isLoading: false,
      error: null,
      refetch: mockRefetch,
      rename: mockRename,
      remove: mockRemove,
    });

    mockUseRegisterPasskey.mockReturnValue({
      register: mockRegister,
      isLoading: false,
      error: null,
    });
  });

  it('renders passkey list', () => {
    render(<PasskeyManagement />);

    expect(screen.getByText('My Passkey')).toBeInTheDocument();
    expect(screen.getByText('Work Key')).toBeInTheDocument();
  });

  it('shows device type badges', () => {
    render(<PasskeyManagement />);

    expect(screen.getByText('Synced passkey')).toBeInTheDocument();
    expect(screen.getByText('Device-bound')).toBeInTheDocument();
  });

  it('shows empty state when no passkeys', () => {
    mockUsePasskeys.mockReturnValue({
      passkeys: [],
      isLoading: false,
      error: null,
      refetch: mockRefetch,
      rename: mockRename,
      remove: mockRemove,
    });

    render(<PasskeyManagement />);

    expect(screen.getByText('No passkeys registered yet.')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    mockUsePasskeys.mockReturnValue({
      passkeys: [],
      isLoading: true,
      error: null,
      refetch: mockRefetch,
      rename: mockRename,
      remove: mockRemove,
    });

    render(<PasskeyManagement />);

    // Should not show the "Add Passkey" button text in loading state — skeleton is shown
    expect(screen.queryByText('My Passkey')).not.toBeInTheDocument();
  });

  it('shows error alert', () => {
    mockUsePasskeys.mockReturnValue({
      passkeys: [],
      isLoading: false,
      error: 'Failed to load',
      refetch: mockRefetch,
      rename: mockRename,
      remove: mockRemove,
    });

    render(<PasskeyManagement />);

    expect(screen.getByText('Failed to load')).toBeInTheDocument();
  });

  it('shows register error alert', () => {
    mockUseRegisterPasskey.mockReturnValue({
      register: mockRegister,
      isLoading: false,
      error: 'Registration failed',
    });

    render(<PasskeyManagement />);

    expect(screen.getByText('Registration failed')).toBeInTheDocument();
  });

  it('renders Add Passkey button', () => {
    render(<PasskeyManagement />);

    expect(screen.getByText('Add Passkey')).toBeInTheDocument();
  });

  it('calls register on Add Passkey click', () => {
    render(<PasskeyManagement />);

    fireEvent.click(screen.getByText('Add Passkey'));

    expect(mockRegister).toHaveBeenCalled();
  });

  it('shows Registering state', () => {
    mockUseRegisterPasskey.mockReturnValue({
      register: mockRegister,
      isLoading: true,
      error: null,
    });

    render(<PasskeyManagement />);

    expect(screen.getByText('Registering...')).toBeInTheDocument();
  });

  it('shows rename form when Rename is clicked', () => {
    render(<PasskeyManagement />);

    const renameButtons = screen.getAllByText('Rename');
    fireEvent.click(renameButtons[0]!);

    expect(screen.getByText('Save')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('shows unsupported message when WebAuthn not available', () => {
    // Remove PublicKeyCredential
    Object.defineProperty(window, 'PublicKeyCredential', {
      value: undefined,
      writable: true,
      configurable: true,
    });
    // Need to also delete it from window
    delete (window as unknown as Record<string, unknown>)['PublicKeyCredential'];

    render(<PasskeyManagement />);

    expect(screen.getByText('Passkeys are not supported in this browser.')).toBeInTheDocument();
  });
});
