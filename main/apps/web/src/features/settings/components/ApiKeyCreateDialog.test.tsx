// main/apps/web/src/features/settings/components/ApiKeyCreateDialog.test.tsx
/**
 * Tests for ApiKeyCreateDialog component.
 */

import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// ============================================================================
// Mocks
// ============================================================================

vi.mock('../hooks/useApiKeys', () => ({
  useCreateApiKey: vi.fn(),
}));

vi.mock('@bslt/ui', async () => {
  const actual = await vi.importActual('@bslt/ui');

  return {
    ...actual,
    Modal: {
      Root: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
        open ? <div data-testid="modal-root">{children}</div> : null,
      Header: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
      Title: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
      Description: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
      Close: () => null,
      Body: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
      Footer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    },
  };
});

import { useCreateApiKey } from '../hooks/useApiKeys';

import { ApiKeyCreateDialog } from './ApiKeyCreateDialog';

// ============================================================================
// Tests
// ============================================================================

describe('ApiKeyCreateDialog', () => {
  const defaultProps = {
    open: true,
    onClose: vi.fn(),
    onKeyCreated: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useCreateApiKey).mockReturnValue({
      createKey: vi.fn(),
      isLoading: false,
      isSuccess: false,
      isError: false,
      error: null,
      data: null,
      reset: vi.fn(),
    });
  });

  it('should render nothing when not open', () => {
    render(<ApiKeyCreateDialog {...defaultProps} open={false} />);
    expect(screen.queryByTestId('modal-root')).not.toBeInTheDocument();
  });

  it('should render the creation form when open', () => {
    render(<ApiKeyCreateDialog {...defaultProps} />);
    expect(screen.getByText('Create API Key')).toBeInTheDocument();
    expect(screen.getByTestId('api-key-name-input')).toBeInTheDocument();
    expect(screen.getByTestId('create-key-button')).toBeInTheDocument();
  });

  it('should disable create button when name is empty', () => {
    render(<ApiKeyCreateDialog {...defaultProps} />);
    expect(screen.getByTestId('create-key-button')).toBeDisabled();
  });

  it('should enable create button when name and scopes are provided', async () => {
    const user = userEvent.setup();
    render(<ApiKeyCreateDialog {...defaultProps} />);

    await user.type(screen.getByTestId('api-key-name-input'), 'Test Key');

    expect(screen.getByTestId('create-key-button')).not.toBeDisabled();
  });

  it('should call createKey with name and scopes on submit', async () => {
    const user = userEvent.setup();
    const mockCreateKey = vi.fn();

    vi.mocked(useCreateApiKey).mockReturnValue({
      createKey: mockCreateKey,
      isLoading: false,
      isSuccess: false,
      isError: false,
      error: null,
      data: null,
      reset: vi.fn(),
    });

    render(<ApiKeyCreateDialog {...defaultProps} />);

    await user.type(screen.getByTestId('api-key-name-input'), 'CI Pipeline');
    await user.click(screen.getByTestId('create-key-button'));

    expect(mockCreateKey).toHaveBeenCalledWith({
      name: 'CI Pipeline',
      scopes: ['read'],
    });
  });

  it('should show copy-once modal after successful key creation', async () => {
    let onSuccessCallback: ((response: any) => void) | undefined;

    vi.mocked(useCreateApiKey).mockImplementation((options) => {
      onSuccessCallback = options?.onSuccess;
      return {
        createKey: vi.fn().mockImplementation(() => {
          onSuccessCallback?.({
            plaintext: 'bslt_test_abc123',
            apiKey: {
              id: 'key-1',
              tenantId: null,
              userId: 'user-1',
              name: 'Test Key',
              keyPrefix: 'bslt_test',
              scopes: ['read'],
              lastUsedAt: null,
              expiresAt: null,
              revokedAt: null,
              createdAt: new Date().toISOString(),
            },
          });
        }),
        isLoading: false,
        isSuccess: false,
        isError: false,
        error: null,
        data: null,
        reset: vi.fn(),
      };
    });

    const user = userEvent.setup();
    render(<ApiKeyCreateDialog {...defaultProps} />);

    await user.type(screen.getByTestId('api-key-name-input'), 'Test Key');
    await user.click(screen.getByTestId('create-key-button'));

    await waitFor(() => {
      expect(screen.getByText('API Key Created')).toBeInTheDocument();
      expect(screen.getByTestId('plaintext-key-input')).toHaveValue('bslt_test_abc123');
      expect(screen.getByTestId('dismiss-key-button')).toBeInTheDocument();
    });
  });

  it('should show error message when creation fails', () => {
    vi.mocked(useCreateApiKey).mockReturnValue({
      createKey: vi.fn(),
      isLoading: false,
      isSuccess: false,
      isError: true,
      error: new Error('Rate limit exceeded'),
      data: null,
      reset: vi.fn(),
    });

    render(<ApiKeyCreateDialog {...defaultProps} />);
    expect(screen.getByText('Rate limit exceeded')).toBeInTheDocument();
  });

  it('should show loading state during creation', () => {
    vi.mocked(useCreateApiKey).mockReturnValue({
      createKey: vi.fn(),
      isLoading: true,
      isSuccess: false,
      isError: false,
      error: null,
      data: null,
      reset: vi.fn(),
    });

    render(<ApiKeyCreateDialog {...defaultProps} />);
    expect(screen.getByTestId('create-key-button')).toHaveTextContent('Creating...');
    expect(screen.getByTestId('create-key-button')).toBeDisabled();
  });
});
