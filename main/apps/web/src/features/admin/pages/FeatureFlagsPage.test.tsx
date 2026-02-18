// main/apps/web/src/features/admin/pages/FeatureFlagsPage.test.tsx
/**
 * FeatureFlagsPage Component Tests
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  useCreateFeatureFlag,
  useDeleteFeatureFlag,
  useFeatureFlags,
  useUpdateFeatureFlag,
} from '../hooks/useFeatureFlags';

import { FeatureFlagsPage } from './FeatureFlagsPage';

import type { ReactNode } from 'react';

// Mock hooks
vi.mock('../hooks/useFeatureFlags', () => ({
  useFeatureFlags: vi.fn(),
  useCreateFeatureFlag: vi.fn(),
  useUpdateFeatureFlag: vi.fn(),
  useDeleteFeatureFlag: vi.fn(),
}));

// Mock UI components
vi.mock('@bslt/ui', async () => {
  const actual = await vi.importActual('@bslt/ui');

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
    }: {
      children: ReactNode;
      onClick?: () => void;
      disabled?: boolean;
    }) => (
      <button onClick={onClick} disabled={disabled}>
        {children}
      </button>
    ),
    Heading: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
    Input: ({
      value,
      onChange,
      placeholder,
    }: {
      value?: string;
      onChange?: (e: { target: { value: string } }) => void;
      placeholder?: string;
    }) => <input value={value} onChange={onChange} placeholder={placeholder} />,
    Skeleton: (props: { width?: string | number; height?: string | number }) => (
      <div data-testid="skeleton" style={{ width: props.width, height: props.height }} />
    ),
    Switch: ({
      checked,
      onChange,
      disabled,
    }: {
      checked?: boolean;
      onChange?: () => void;
      disabled?: boolean;
    }) => (
      <button
        data-testid="switch"
        role="switch"
        aria-checked={checked}
        onClick={onChange}
        disabled={disabled}
      >
        Toggle
      </button>
    ),
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

const mockFlags = [
  {
    key: 'billing.seat_based',
    description: 'Enable seat-based billing',
    isEnabled: true,
    defaultValue: null,
    metadata: {},
    createdAt: '2026-02-01T10:00:00Z',
    updatedAt: '2026-02-01T10:00:00Z',
  },
  {
    key: 'ui.dark_mode',
    description: null,
    isEnabled: false,
    defaultValue: null,
    metadata: {},
    createdAt: '2026-01-15T10:00:00Z',
    updatedAt: '2026-01-15T10:00:00Z',
  },
];

const defaultCreateResult = {
  createFlag: vi.fn(),
  isLoading: false,
  isError: false,
  error: null,
};

const defaultUpdateResult = {
  updateFlag: vi.fn(),
  isLoading: false,
  isError: false,
  error: null,
};

const defaultDeleteResult = {
  deleteFlag: vi.fn(),
  isLoading: false,
  isError: false,
  error: null,
};

describe('FeatureFlagsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useCreateFeatureFlag).mockReturnValue(defaultCreateResult);
    vi.mocked(useUpdateFeatureFlag).mockReturnValue(defaultUpdateResult);
    vi.mocked(useDeleteFeatureFlag).mockReturnValue(defaultDeleteResult);
  });

  // ============================================================================
  // Loading State
  // ============================================================================

  describe('loading state', () => {
    it('should render skeleton placeholders when loading', () => {
      vi.mocked(useFeatureFlags).mockReturnValue({
        data: undefined,
        isLoading: true,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      render(<FeatureFlagsPage />);

      expect(screen.getAllByTestId('skeleton').length).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // Error State
  // ============================================================================

  describe('error state', () => {
    it('should render error alert', () => {
      vi.mocked(useFeatureFlags).mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
        error: new Error('Forbidden'),
        refetch: vi.fn(),
      });

      render(<FeatureFlagsPage />);

      expect(screen.getByText('Forbidden')).toBeInTheDocument();
    });
  });

  // ============================================================================
  // Empty State
  // ============================================================================

  describe('empty state', () => {
    it('should show empty message', () => {
      vi.mocked(useFeatureFlags).mockReturnValue({
        data: { flags: [] },
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      render(<FeatureFlagsPage />);

      expect(
        screen.getByText('No feature flags defined. Create one to get started.'),
      ).toBeInTheDocument();
    });
  });

  // ============================================================================
  // Table Rendering
  // ============================================================================

  describe('table rendering', () => {
    it('should render flag keys', () => {
      vi.mocked(useFeatureFlags).mockReturnValue({
        data: { flags: mockFlags },
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      render(<FeatureFlagsPage />);

      expect(screen.getByText('billing.seat_based')).toBeInTheDocument();
      expect(screen.getByText('ui.dark_mode')).toBeInTheDocument();
    });

    it('should show Enabled badge for enabled flags', () => {
      vi.mocked(useFeatureFlags).mockReturnValue({
        data: { flags: mockFlags },
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      render(<FeatureFlagsPage />);

      expect(screen.getByText('Enabled')).toBeInTheDocument();
      expect(screen.getByText('Disabled')).toBeInTheDocument();
    });

    it('should show description or dash for null description', () => {
      vi.mocked(useFeatureFlags).mockReturnValue({
        data: { flags: mockFlags },
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      render(<FeatureFlagsPage />);

      expect(screen.getByText('Enable seat-based billing')).toBeInTheDocument();
      expect(screen.getByText('-')).toBeInTheDocument();
    });
  });

  // ============================================================================
  // Create Form
  // ============================================================================

  describe('create form', () => {
    it('should toggle create form', () => {
      vi.mocked(useFeatureFlags).mockReturnValue({
        data: { flags: [] },
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      render(<FeatureFlagsPage />);

      expect(screen.queryByPlaceholderText('e.g. billing.seat_based')).not.toBeInTheDocument();

      fireEvent.click(screen.getByText('Create Flag'));

      expect(screen.getByPlaceholderText('e.g. billing.seat_based')).toBeInTheDocument();
    });
  });

  // ============================================================================
  // Actions
  // ============================================================================

  describe('actions', () => {
    it('should call deleteFlag on Delete click', () => {
      const mockDelete = vi.fn();
      vi.mocked(useDeleteFeatureFlag).mockReturnValue({
        deleteFlag: mockDelete,
        isLoading: false,
        isError: false,
        error: null,
      });

      vi.mocked(useFeatureFlags).mockReturnValue({
        data: { flags: [mockFlags[0]!] },
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      render(<FeatureFlagsPage />);
      fireEvent.click(screen.getByText('Delete'));

      expect(mockDelete).toHaveBeenCalledWith('billing.seat_based');
    });
  });

  // ============================================================================
  // Header
  // ============================================================================

  describe('header', () => {
    it('should render Feature Flags heading', () => {
      vi.mocked(useFeatureFlags).mockReturnValue({
        data: { flags: [] },
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      render(<FeatureFlagsPage />);

      expect(screen.getByText('Feature Flags')).toBeInTheDocument();
    });
  });
});
