// src/apps/web/src/features/workspace/components/WorkspaceAuditLog.test.tsx
/**
 * Tests for WorkspaceAuditLog component.
 */

import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// ============================================================================
// Mocks
// ============================================================================

vi.mock('../hooks/useAuditLog', () => ({
  useAuditLog: vi.fn(),
}));

import { useAuditLog } from '../hooks/useAuditLog';

import { WorkspaceAuditLog } from './WorkspaceAuditLog';

import type { AuditEvent } from '../hooks/useAuditLog';

// ============================================================================
// Test Data
// ============================================================================

const mockEvents: AuditEvent[] = [
  {
    id: 'evt-1',
    action: 'create.member',
    actorId: 'user-1',
    details: 'Added user-2 as member',
    createdAt: '2024-01-15T10:00:00Z',
  },
  {
    id: 'evt-2',
    action: 'update.settings',
    actorId: 'user-1',
    details: 'Updated workspace name',
    createdAt: '2024-01-14T09:00:00Z',
  },
  {
    id: 'evt-3',
    action: 'delete.invitation',
    actorId: 'user-3',
    details: 'Revoked invitation for user-4',
    createdAt: '2024-01-13T08:00:00Z',
  },
];

// ============================================================================
// Tests
// ============================================================================

describe('WorkspaceAuditLog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render loading state with skeletons', () => {
    vi.mocked(useAuditLog).mockReturnValue({
      events: [],
      isLoading: true,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });

    const { container } = render(<WorkspaceAuditLog tenantId="tenant-1" />);

    const skeletons = container.querySelectorAll('.skeleton');
    expect(skeletons.length).toBe(4);
  });

  it('should render error state', () => {
    vi.mocked(useAuditLog).mockReturnValue({
      events: [],
      isLoading: false,
      isError: true,
      error: new Error('Failed to fetch audit events'),
      refetch: vi.fn(),
    });

    render(<WorkspaceAuditLog tenantId="tenant-1" />);

    expect(screen.getByText('Failed to fetch audit events')).toBeInTheDocument();
  });

  it('should render empty state', () => {
    vi.mocked(useAuditLog).mockReturnValue({
      events: [],
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<WorkspaceAuditLog tenantId="tenant-1" />);

    expect(screen.getByText('No audit events')).toBeInTheDocument();
    expect(
      screen.getByText('Audit events will appear here as actions are recorded'),
    ).toBeInTheDocument();
  });

  it('should render audit events in a table', () => {
    vi.mocked(useAuditLog).mockReturnValue({
      events: mockEvents,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<WorkspaceAuditLog tenantId="tenant-1" />);

    expect(screen.getByText('Action')).toBeInTheDocument();
    expect(screen.getByText('Actor')).toBeInTheDocument();
    expect(screen.getByText('Date')).toBeInTheDocument();
    expect(screen.getByText('Details')).toBeInTheDocument();

    expect(screen.getByText('create.member')).toBeInTheDocument();
    expect(screen.getByText('update.settings')).toBeInTheDocument();
    expect(screen.getByText('delete.invitation')).toBeInTheDocument();

    // user-1 appears in two events
    expect(screen.getAllByText('user-1')).toHaveLength(2);
    expect(screen.getByText('user-3')).toBeInTheDocument();

    expect(screen.getByText('Added user-2 as member')).toBeInTheDocument();
    expect(screen.getByText('Updated workspace name')).toBeInTheDocument();
    expect(screen.getByText('Revoked invitation for user-4')).toBeInTheDocument();
  });

  it('should pass tenantId to useAuditLog', () => {
    vi.mocked(useAuditLog).mockReturnValue({
      events: [],
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<WorkspaceAuditLog tenantId="tenant-abc" />);

    expect(useAuditLog).toHaveBeenCalledWith('tenant-abc');
  });
});
