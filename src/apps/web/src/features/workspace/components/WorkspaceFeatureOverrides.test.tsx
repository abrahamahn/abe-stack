// src/apps/web/src/features/workspace/components/WorkspaceFeatureOverrides.test.tsx
/**
 * Tests for WorkspaceFeatureOverrides component.
 */

import { QueryCache, QueryCacheProvider } from '@abe-stack/client-engine';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';


// ============================================================================
// Mocks
// ============================================================================

vi.mock('../hooks/useWorkspaceFeatureOverrides', () => ({
  useWorkspaceFeatureOverrides: vi.fn(),
  useSetFeatureOverride: vi.fn(),
}));

import { useSetFeatureOverride, useWorkspaceFeatureOverrides } from '../hooks/useWorkspaceFeatureOverrides';

import { WorkspaceFeatureOverrides } from './WorkspaceFeatureOverrides';

import type { FlagWithOverride } from '../hooks/useWorkspaceFeatureOverrides';


// ============================================================================
// Test Setup
// ============================================================================

function renderWithProviders(ui: React.ReactElement): ReturnType<typeof render> {
  const queryCache = new QueryCache();

  return render(<QueryCacheProvider cache={queryCache}>{ui}</QueryCacheProvider>);
}

const mockFlags: FlagWithOverride[] = [
  {
    key: 'test.feature1',
    description: 'Test Feature 1',
    globalEnabled: true,
    overrideState: 'inherit',
  },
  {
    key: 'test.feature2',
    description: 'Test Feature 2',
    globalEnabled: false,
    overrideState: 'off',
  },
];

// ============================================================================
// Tests
// ============================================================================

describe('WorkspaceFeatureOverrides', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render loading state', () => {
    vi.mocked(useWorkspaceFeatureOverrides).mockReturnValue({
      flags: [],
      isLoading: true,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });

    vi.mocked(useSetFeatureOverride).mockReturnValue({
      setOverride: vi.fn(),
      isLoading: false,
      isError: false,
      error: null,
    });

    renderWithProviders(<WorkspaceFeatureOverrides tenantId="tenant-1" />);

    expect(screen.getByText('Feature Overrides')).toBeInTheDocument();
  });

  it('should render feature flags with override controls', () => {
    vi.mocked(useWorkspaceFeatureOverrides).mockReturnValue({
      flags: mockFlags,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });

    vi.mocked(useSetFeatureOverride).mockReturnValue({
      setOverride: vi.fn(),
      isLoading: false,
      isError: false,
      error: null,
    });

    renderWithProviders(<WorkspaceFeatureOverrides tenantId="tenant-1" />);

    expect(screen.getByText('test.feature1')).toBeInTheDocument();
    expect(screen.getByText('Test Feature 1')).toBeInTheDocument();
    expect(screen.getByText('test.feature2')).toBeInTheDocument();
    expect(screen.getByText('Test Feature 2')).toBeInTheDocument();
  });

  it('should call setOverride when clicking toggle buttons', async () => {
    const user = userEvent.setup();
    const mockSetOverride = vi.fn();
    const mockRefetch = vi.fn();

    vi.mocked(useWorkspaceFeatureOverrides).mockReturnValue({
      flags: mockFlags,
      isLoading: false,
      isError: false,
      error: null,
      refetch: mockRefetch,
    });

    vi.mocked(useSetFeatureOverride).mockReturnValue({
      setOverride: mockSetOverride,
      isLoading: false,
      isError: false,
      error: null,
    });

    renderWithProviders(<WorkspaceFeatureOverrides tenantId="tenant-1" />);

    // Find all "On" buttons (there are 2, one for each flag)
    const onButtons = screen.getAllByText('On');
    await user.click(onButtons[0]);

    expect(mockSetOverride).toHaveBeenCalledWith('tenant-1', 'test.feature1', 'on');
  });

  it('should display error message', () => {
    vi.mocked(useWorkspaceFeatureOverrides).mockReturnValue({
      flags: [],
      isLoading: false,
      isError: true,
      error: new Error('Failed to load flags'),
      refetch: vi.fn(),
    });

    vi.mocked(useSetFeatureOverride).mockReturnValue({
      setOverride: vi.fn(),
      isLoading: false,
      isError: false,
      error: null,
    });

    renderWithProviders(<WorkspaceFeatureOverrides tenantId="tenant-1" />);

    expect(screen.getByText('Failed to load flags')).toBeInTheDocument();
  });

  it('should display empty state when no flags exist', () => {
    vi.mocked(useWorkspaceFeatureOverrides).mockReturnValue({
      flags: [],
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });

    vi.mocked(useSetFeatureOverride).mockReturnValue({
      setOverride: vi.fn(),
      isLoading: false,
      isError: false,
      error: null,
    });

    renderWithProviders(<WorkspaceFeatureOverrides tenantId="tenant-1" />);

    expect(screen.getByText('No feature flags defined yet.')).toBeInTheDocument();
  });

  it('should show success message after successful override', async () => {
    const mockRefetch = vi.fn();
    const mockSetOverride = vi.fn();

    vi.mocked(useWorkspaceFeatureOverrides).mockReturnValue({
      flags: mockFlags,
      isLoading: false,
      isError: false,
      error: null,
      refetch: mockRefetch,
    });

    // Mock successful mutation with onSuccess callback
    vi.mocked(useSetFeatureOverride).mockImplementation((options) => {
      return {
        setOverride: (tenantId: string, key: string, state: string) => {
          mockSetOverride(tenantId, key, state);
          options?.onSuccess?.();
        },
        isLoading: false,
        isError: false,
        error: null,
      };
    });

    renderWithProviders(<WorkspaceFeatureOverrides tenantId="tenant-1" />);

    const user = userEvent.setup();
    const onButtons = screen.getAllByText('On');
    await user.click(onButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Feature override updated successfully')).toBeInTheDocument();
    });
  });
});
