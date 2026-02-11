// src/apps/web/src/features/settings/components/ApiKeysManagement.test.tsx
/**
 * ApiKeysManagement Component Tests
 *
 * Tests for the API keys management UI covering:
 * - Loading and error states
 * - Table rendering with key data
 * - Empty state
 * - Create form toggling
 * - Revoke and delete actions
 * - Plaintext key display and copy
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useApiKeys, useCreateApiKey, useDeleteApiKey, useRevokeApiKey } from '../hooks/useApiKeys';

import { ApiKeysManagement } from './ApiKeysManagement';

import type { ReactNode } from 'react';

// Mock hooks
vi.mock('../hooks/useApiKeys', () => ({
  useApiKeys: vi.fn(),
  useCreateApiKey: vi.fn(),
  useRevokeApiKey: vi.fn(),
  useDeleteApiKey: vi.fn(),
}));

// Mock UI components
vi.mock('@abe-stack/ui', async () => {
  const actual = await vi.importActual('@abe-stack/ui');

  return {
    ...actual,
    Alert: ({ children, tone }: { children: ReactNode; tone: string }) => (
      <div data-testid="alert" data-tone={tone}>
        {children}
      </div>
    ),
    Badge: ({ children, tone }: { children: ReactNode; tone: string }) => (
      <span data-testid="badge" data-tone={tone}>
        {children}
      </span>
    ),
    Button: ({
      children,
      onClick,
      disabled,
      type,
    }: {
      children: ReactNode;
      onClick?: () => void;
      disabled?: boolean;
      type?: string;
    }) => (
      <button onClick={onClick} disabled={disabled} type={type as 'button'}>
        {children}
      </button>
    ),
    Heading: ({ children }: { children: ReactNode }) => <h3>{children}</h3>,
    Input: ({
      value,
      onChange,
      placeholder,
      readOnly,
      className,
    }: {
      value?: string;
      onChange?: (e: { target: { value: string } }) => void;
      placeholder?: string;
      readOnly?: boolean;
      className?: string;
    }) => (
      <input
        data-testid="input"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        readOnly={readOnly}
        className={className}
      />
    ),
    Spinner: () => <div data-testid="spinner">Loading...</div>,
    Table: ({ children }: { children: ReactNode }) => <table>{children}</table>,
    TableBody: ({ children }: { children: ReactNode }) => <tbody>{children}</tbody>,
    TableCell: ({ children }: { children: ReactNode }) => <td>{children}</td>,
    TableHead: ({ children }: { children: ReactNode }) => <th>{children}</th>,
    TableHeader: ({ children }: { children: ReactNode }) => <thead>{children}</thead>,
    TableRow: ({ children }: { children: ReactNode }) => <tr>{children}</tr>,
    Text: ({ children }: { children: ReactNode }) => <span>{children}</span>,
  };
});

// ============================================================================
// Test Data
// ============================================================================

const mockActiveKey = {
  id: 'key-1',
  tenantId: null,
  userId: 'user-1',
  name: 'CI Pipeline',
  keyPrefix: 'abe_k1',
  scopes: [],
  lastUsedAt: '2026-02-10T08:00:00Z',
  expiresAt: null,
  revokedAt: null,
  createdAt: '2026-02-01T10:00:00Z',
  updatedAt: '2026-02-01T10:00:00Z',
};

const mockRevokedKey = {
  id: 'key-2',
  tenantId: null,
  userId: 'user-1',
  name: 'Old Key',
  keyPrefix: 'abe_k2',
  scopes: [],
  lastUsedAt: null,
  expiresAt: null,
  revokedAt: '2026-02-05T12:00:00Z',
  createdAt: '2026-01-15T10:00:00Z',
  updatedAt: '2026-02-05T12:00:00Z',
};

const defaultCreateResult = {
  createKey: vi.fn(),
  isLoading: false,
  isSuccess: false,
  isError: false,
  error: null,
  data: null,
  reset: vi.fn(),
};

const defaultRevokeResult = {
  revokeKey: vi.fn(),
  isLoading: false,
  isError: false,
  error: null,
};

const defaultDeleteResult = {
  deleteKey: vi.fn(),
  isLoading: false,
  isError: false,
  error: null,
};

describe('ApiKeysManagement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useCreateApiKey).mockReturnValue(defaultCreateResult);
    vi.mocked(useRevokeApiKey).mockReturnValue(defaultRevokeResult);
    vi.mocked(useDeleteApiKey).mockReturnValue(defaultDeleteResult);
  });

  // ============================================================================
  // Loading State
  // ============================================================================

  describe('loading state', () => {
    it('should render skeleton loaders when loading', () => {
      vi.mocked(useApiKeys).mockReturnValue({
        apiKeys: [],
        isLoading: true,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      render(<ApiKeysManagement />);

      const skeletons = document.querySelectorAll('.skeleton');
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // Error State
  // ============================================================================

  describe('error state', () => {
    it('should render error alert', () => {
      vi.mocked(useApiKeys).mockReturnValue({
        apiKeys: [],
        isLoading: false,
        isError: true,
        error: new Error('Server error'),
        refetch: vi.fn(),
      });

      render(<ApiKeysManagement />);

      expect(screen.getByText('Server error')).toBeInTheDocument();
    });

    it('should show fallback error message', () => {
      vi.mocked(useApiKeys).mockReturnValue({
        apiKeys: [],
        isLoading: false,
        isError: true,
        error: null,
        refetch: vi.fn(),
      });

      render(<ApiKeysManagement />);

      expect(screen.getByText('Failed to load API keys')).toBeInTheDocument();
    });
  });

  // ============================================================================
  // Empty State
  // ============================================================================

  describe('empty state', () => {
    it('should show empty message when no keys', () => {
      vi.mocked(useApiKeys).mockReturnValue({
        apiKeys: [],
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      render(<ApiKeysManagement />);

      expect(screen.getByText('No API keys yet')).toBeInTheDocument();
      expect(screen.getByText('Create one to get started')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Create API Key' })).toBeInTheDocument();
    });
  });

  // ============================================================================
  // Table Rendering
  // ============================================================================

  describe('table rendering', () => {
    it('should render key name and prefix', () => {
      vi.mocked(useApiKeys).mockReturnValue({
        apiKeys: [mockActiveKey],
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      render(<ApiKeysManagement />);

      expect(screen.getByText('CI Pipeline')).toBeInTheDocument();
      expect(screen.getByText('abe_k1...')).toBeInTheDocument();
    });

    it('should show Active badge for active keys', () => {
      vi.mocked(useApiKeys).mockReturnValue({
        apiKeys: [mockActiveKey],
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      render(<ApiKeysManagement />);

      expect(screen.getByText('Active')).toBeInTheDocument();
    });

    it('should show Revoked badge for revoked keys', () => {
      vi.mocked(useApiKeys).mockReturnValue({
        apiKeys: [mockRevokedKey],
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      render(<ApiKeysManagement />);

      expect(screen.getByText('Revoked')).toBeInTheDocument();
    });

    it('should show Revoke button only for active keys', () => {
      vi.mocked(useApiKeys).mockReturnValue({
        apiKeys: [mockActiveKey, mockRevokedKey],
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      render(<ApiKeysManagement />);

      const revokeButtons = screen.getAllByText('Revoke');
      expect(revokeButtons).toHaveLength(1);
    });

    it('should show Delete button for all keys', () => {
      vi.mocked(useApiKeys).mockReturnValue({
        apiKeys: [mockActiveKey, mockRevokedKey],
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      render(<ApiKeysManagement />);

      const deleteButtons = screen.getAllByText('Delete');
      expect(deleteButtons).toHaveLength(2);
    });

    it('should show "Never" for null lastUsedAt', () => {
      vi.mocked(useApiKeys).mockReturnValue({
        apiKeys: [mockRevokedKey],
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      render(<ApiKeysManagement />);

      expect(screen.getByText('Never')).toBeInTheDocument();
    });
  });

  // ============================================================================
  // Create Form
  // ============================================================================

  describe('create form', () => {
    it('should toggle create form on button click', () => {
      vi.mocked(useApiKeys).mockReturnValue({
        apiKeys: [],
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      render(<ApiKeysManagement />);

      expect(screen.queryByPlaceholderText('e.g. CI/CD Pipeline')).not.toBeInTheDocument();

      fireEvent.click(screen.getByText('Create Key'));

      expect(screen.getByPlaceholderText('e.g. CI/CD Pipeline')).toBeInTheDocument();
    });

    it('should show Cancel when form is open', () => {
      vi.mocked(useApiKeys).mockReturnValue({
        apiKeys: [],
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      render(<ApiKeysManagement />);

      fireEvent.click(screen.getByText('Create Key'));

      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    it('should disable Create button when name is empty', () => {
      vi.mocked(useApiKeys).mockReturnValue({
        apiKeys: [],
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      render(<ApiKeysManagement />);
      fireEvent.click(screen.getByText('Create Key'));

      const createButton = screen.getByText('Create');
      expect(createButton).toBeDisabled();
    });
  });

  // ============================================================================
  // Actions
  // ============================================================================

  describe('actions', () => {
    it('should call revokeKey on Revoke click', () => {
      const mockRevoke = vi.fn();
      vi.mocked(useRevokeApiKey).mockReturnValue({
        revokeKey: mockRevoke,
        isLoading: false,
        isError: false,
        error: null,
      });

      vi.mocked(useApiKeys).mockReturnValue({
        apiKeys: [mockActiveKey],
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      render(<ApiKeysManagement />);
      fireEvent.click(screen.getByText('Revoke'));

      expect(mockRevoke).toHaveBeenCalledWith('key-1');
    });

    it('should call deleteKey on Delete click', () => {
      const mockDelete = vi.fn();
      vi.mocked(useDeleteApiKey).mockReturnValue({
        deleteKey: mockDelete,
        isLoading: false,
        isError: false,
        error: null,
      });

      vi.mocked(useApiKeys).mockReturnValue({
        apiKeys: [mockActiveKey],
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      render(<ApiKeysManagement />);
      fireEvent.click(screen.getByText('Delete'));

      expect(mockDelete).toHaveBeenCalledWith('key-1');
    });
  });

  // ============================================================================
  // Header
  // ============================================================================

  describe('header', () => {
    it('should render API Keys heading', () => {
      vi.mocked(useApiKeys).mockReturnValue({
        apiKeys: [],
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      render(<ApiKeysManagement />);

      expect(screen.getByText('API Keys')).toBeInTheDocument();
    });
  });
});
