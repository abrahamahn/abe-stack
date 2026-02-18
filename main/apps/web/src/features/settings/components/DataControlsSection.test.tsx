// main/apps/web/src/features/settings/components/DataControlsSection.test.tsx
/**
 * Data Controls Section Tests
 *
 * Tests for account status display, deactivation, deletion with confirmation,
 * reactivation, consent preferences, and data export integration.
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DataControlsSection } from './DataControlsSection';

import type { ReactNode } from 'react';

// ============================================================================
// Mocks
// ============================================================================

const mockDeactivate = vi.fn();
const mockRequestDeletion = vi.fn();
const mockReactivate = vi.fn();
const mockResetDeactivate = vi.fn();
const mockResetDelete = vi.fn();
const mockResetReactivate = vi.fn();

vi.mock('../hooks/useAccountLifecycle', () => ({
  useDeactivateAccount: () => ({
    deactivate: mockDeactivate,
    isLoading: false,
    error: null,
    reset: mockResetDeactivate,
  }),
  useDeleteAccount: () => ({
    requestDeletion: mockRequestDeletion,
    isLoading: false,
    error: null,
    reset: mockResetDelete,
  }),
  useReactivateAccount: () => ({
    reactivate: mockReactivate,
    isLoading: false,
    error: null,
    reset: mockResetReactivate,
  }),
}));

vi.mock('./ConsentPreferences', () => ({
  ConsentPreferences: () => <div data-testid="consent-preferences">Consent Preferences</div>,
}));

vi.mock('./DataExportSection', () => ({
  DataExportSection: () => <div data-testid="data-export-section">Data Export Section</div>,
}));

vi.mock('./SudoModal', () => ({
  SudoModal: ({
    open,
    onSuccess,
    onDismiss,
  }: {
    open: boolean;
    onSuccess: (token: string) => void;
    onDismiss: () => void;
  }) =>
    open ? (
      <div data-testid="sudo-modal">
        <button
          data-testid="sudo-confirm"
          onClick={() => {
            onSuccess('test-sudo-token');
          }}
        >
          Confirm
        </button>
        <button data-testid="sudo-dismiss" onClick={onDismiss}>
          Cancel
        </button>
      </div>
    ) : null,
}));

vi.mock('@bslt/ui', async () => {
  const actual = await vi.importActual('@bslt/ui');

  const mockAlert = ({
    children,
    tone,
    'data-testid': testId,
    className,
  }: {
    children: ReactNode;
    tone?: string;
    'data-testid'?: string;
    className?: string;
  }) => (
    <div data-testid={testId ?? `alert-${tone ?? 'info'}`} className={className}>
      {children}
    </div>
  );

  const mockBadge = ({
    children,
    tone,
    'data-testid': testId,
  }: {
    children: ReactNode;
    tone?: string;
    'data-testid'?: string;
  }) => (
    <span data-testid={testId} data-tone={tone}>
      {children}
    </span>
  );

  const mockButton = ({
    children,
    onClick,
    disabled,
    'data-testid': testId,
    className,
  }: {
    children: ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    'data-testid'?: string;
    className?: string;
  }) => (
    <button data-testid={testId} onClick={onClick} disabled={disabled} className={className}>
      {children}
    </button>
  );

  const mockCard = ({ children, className }: { children: ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  );

  const mockHeading = ({ children, className }: { children: ReactNode; className?: string }) => (
    <h4 className={className}>{children}</h4>
  );

  const mockText = ({
    children,
    className,
  }: {
    children: ReactNode;
    className?: string;
    size?: string;
    tone?: string;
  }) => <span className={className}>{children}</span>;

  return {
    ...actual,
    Alert: mockAlert,
    Badge: mockBadge,
    Button: mockButton,
    Card: mockCard,
    Heading: mockHeading,
    Text: mockText,
  };
});

describe('DataControlsSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================================
  // Rendering - Active Account
  // ============================================================================

  describe('active account', () => {
    it('should render account status badge', () => {
      render(<DataControlsSection accountStatus="active" />);
      expect(screen.getByTestId('account-status-badge')).toBeInTheDocument();
      expect(screen.getByText('Active')).toBeInTheDocument();
    });

    it('should render deactivate button', () => {
      render(<DataControlsSection accountStatus="active" />);
      expect(screen.getByTestId('deactivate-button')).toBeInTheDocument();
    });

    it('should render delete button', () => {
      render(<DataControlsSection accountStatus="active" />);
      expect(screen.getByTestId('delete-button')).toBeInTheDocument();
    });

    it('should not render reactivate button', () => {
      render(<DataControlsSection accountStatus="active" />);
      expect(screen.queryByTestId('reactivate-button')).not.toBeInTheDocument();
    });

    it('should render consent preferences section', () => {
      render(<DataControlsSection accountStatus="active" />);
      expect(screen.getByTestId('consent-preferences')).toBeInTheDocument();
    });

    it('should render data export section', () => {
      render(<DataControlsSection accountStatus="active" />);
      expect(screen.getByTestId('data-export-section')).toBeInTheDocument();
    });
  });

  // ============================================================================
  // Rendering - Deactivated Account
  // ============================================================================

  describe('deactivated account', () => {
    it('should render Deactivated status badge', () => {
      render(<DataControlsSection accountStatus="deactivated" />);
      expect(screen.getByText('Deactivated')).toBeInTheDocument();
    });

    it('should render reactivate button', () => {
      render(<DataControlsSection accountStatus="deactivated" />);
      expect(screen.getByTestId('reactivate-button')).toBeInTheDocument();
    });

    it('should render delete button', () => {
      render(<DataControlsSection accountStatus="deactivated" />);
      expect(screen.getByTestId('delete-button')).toBeInTheDocument();
    });

    it('should not render deactivate button', () => {
      render(<DataControlsSection accountStatus="deactivated" />);
      expect(screen.queryByTestId('deactivate-button')).not.toBeInTheDocument();
    });
  });

  // ============================================================================
  // Rendering - Pending Deletion Account
  // ============================================================================

  describe('pending deletion account', () => {
    it('should render Pending Deletion status badge', () => {
      render(<DataControlsSection accountStatus="pending_deletion" />);
      expect(screen.getByText('Pending Deletion')).toBeInTheDocument();
    });

    it('should render reactivate button', () => {
      render(<DataControlsSection accountStatus="pending_deletion" />);
      expect(screen.getByTestId('reactivate-button')).toBeInTheDocument();
    });

    it('should not render delete button', () => {
      render(<DataControlsSection accountStatus="pending_deletion" />);
      expect(screen.queryByTestId('delete-button')).not.toBeInTheDocument();
    });

    it('should not render deactivate button', () => {
      render(<DataControlsSection accountStatus="pending_deletion" />);
      expect(screen.queryByTestId('deactivate-button')).not.toBeInTheDocument();
    });
  });

  // ============================================================================
  // Delete Confirmation
  // ============================================================================

  describe('delete confirmation', () => {
    it('should show confirmation alert on first delete click', () => {
      render(<DataControlsSection accountStatus="active" />);

      expect(screen.queryByTestId('delete-confirm-alert')).not.toBeInTheDocument();

      fireEvent.click(screen.getByTestId('delete-button'));

      expect(screen.getByTestId('delete-confirm-alert')).toBeInTheDocument();
    });

    it('should change button text after first click', () => {
      render(<DataControlsSection accountStatus="active" />);

      expect(screen.getByTestId('delete-button')).toHaveTextContent('Delete Account');

      fireEvent.click(screen.getByTestId('delete-button'));

      expect(screen.getByTestId('delete-button')).toHaveTextContent('Confirm Delete Account');
    });

    it('should open sudo modal on second delete click', () => {
      render(<DataControlsSection accountStatus="active" />);

      // First click: show confirmation
      fireEvent.click(screen.getByTestId('delete-button'));
      expect(screen.queryByTestId('sudo-modal')).not.toBeInTheDocument();

      // Second click: open sudo modal
      fireEvent.click(screen.getByTestId('delete-button'));
      expect(screen.getByTestId('sudo-modal')).toBeInTheDocument();
    });
  });

  // ============================================================================
  // Deactivate Flow
  // ============================================================================

  describe('deactivate flow', () => {
    it('should open sudo modal on deactivate click', () => {
      render(<DataControlsSection accountStatus="active" />);

      fireEvent.click(screen.getByTestId('deactivate-button'));
      expect(screen.getByTestId('sudo-modal')).toBeInTheDocument();
    });

    it('should call deactivate after sudo confirmation', () => {
      render(<DataControlsSection accountStatus="active" />);

      fireEvent.click(screen.getByTestId('deactivate-button'));
      fireEvent.click(screen.getByTestId('sudo-confirm'));

      expect(mockDeactivate).toHaveBeenCalledWith({}, 'test-sudo-token');
    });

    it('should close sudo modal on dismiss', () => {
      render(<DataControlsSection accountStatus="active" />);

      fireEvent.click(screen.getByTestId('deactivate-button'));
      expect(screen.getByTestId('sudo-modal')).toBeInTheDocument();

      fireEvent.click(screen.getByTestId('sudo-dismiss'));
      expect(screen.queryByTestId('sudo-modal')).not.toBeInTheDocument();
    });
  });

  // ============================================================================
  // Reactivate Flow
  // ============================================================================

  describe('reactivate flow', () => {
    it('should call reactivate on button click', () => {
      render(<DataControlsSection accountStatus="deactivated" />);

      fireEvent.click(screen.getByTestId('reactivate-button'));
      expect(mockReactivate).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // Default Props
  // ============================================================================

  describe('default props', () => {
    it('should default to active status', () => {
      render(<DataControlsSection />);
      expect(screen.getByText('Active')).toBeInTheDocument();
    });
  });
});
