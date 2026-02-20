// main/apps/web/src/features/workspace/components/MemberDetailPanel.test.tsx
/**
 * Tests for MemberDetailPanel component.
 */

import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MemberDetailPanel } from './MemberDetailPanel';

import type { MemberDetail } from './MemberDetailPanel';
import type { TenantRole } from '@bslt/shared';

// ============================================================================
// Test Data
// ============================================================================

const mockMember: MemberDetail = {
  userId: 'user-123',
  role: 'member',
  createdAt: '2024-01-15T10:00:00Z',
};

const defaultProps = {
  member: mockMember,
  tenantId: 'tenant-1',
  currentUserRole: 'owner' as TenantRole,
  onRoleChange: vi.fn(),
  onRemove: vi.fn(),
  onClose: vi.fn(),
};

// ============================================================================
// Tests
// ============================================================================

describe('MemberDetailPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render member information', () => {
    render(<MemberDetailPanel {...defaultProps} />);

    expect(screen.getByText('Member Details')).toBeInTheDocument();
    expect(screen.getByText('user-123')).toBeInTheDocument();
    expect(screen.getByText('member')).toBeInTheDocument();
  });

  it('should display role badge', () => {
    render(<MemberDetailPanel {...defaultProps} />);

    expect(screen.getByText('member')).toBeInTheDocument();
  });

  it('should show actions for owner role', () => {
    render(<MemberDetailPanel {...defaultProps} currentUserRole="owner" />);

    expect(screen.getByText('Change Role')).toBeInTheDocument();
    expect(screen.getByText('Remove Member')).toBeInTheDocument();
  });

  it('should show actions for admin role', () => {
    render(<MemberDetailPanel {...defaultProps} currentUserRole="admin" />);

    expect(screen.getByText('Change Role')).toBeInTheDocument();
    expect(screen.getByText('Remove Member')).toBeInTheDocument();
  });

  it('should hide actions for member role', () => {
    render(<MemberDetailPanel {...defaultProps} currentUserRole="member" />);

    expect(screen.queryByText('Change Role')).not.toBeInTheDocument();
    expect(screen.queryByText('Remove Member')).not.toBeInTheDocument();
  });

  it('should hide actions for viewer role', () => {
    render(<MemberDetailPanel {...defaultProps} currentUserRole="viewer" />);

    expect(screen.queryByText('Change Role')).not.toBeInTheDocument();
    expect(screen.queryByText('Remove Member')).not.toBeInTheDocument();
  });

  it('should hide actions when member is owner', () => {
    const ownerMember: MemberDetail = {
      userId: 'user-owner',
      role: 'owner',
      createdAt: '2024-01-01T00:00:00Z',
    };

    render(<MemberDetailPanel {...defaultProps} member={ownerMember} currentUserRole="owner" />);

    expect(screen.queryByText('Change Role')).not.toBeInTheDocument();
    expect(screen.queryByText('Remove Member')).not.toBeInTheDocument();
  });

  it('should call onClose when close button is clicked', async () => {
    const user = userEvent.setup();

    render(<MemberDetailPanel {...defaultProps} />);

    await user.click(screen.getByText('Close'));

    expect(defaultProps.onClose).toHaveBeenCalledOnce();
  });

  it('should open confirm dialog when remove is clicked', async () => {
    const user = userEvent.setup();

    render(<MemberDetailPanel {...defaultProps} />);

    await user.click(screen.getByText('Remove Member'));

    expect(
      screen.getByText(
        'Are you sure you want to remove this member? They will lose access to the workspace immediately.',
      ),
    ).toBeInTheDocument();
  });

  it('should call onRemove after confirming removal', async () => {
    const user = userEvent.setup();

    render(<MemberDetailPanel {...defaultProps} />);

    await user.click(screen.getByText('Remove Member'));
    await user.click(screen.getByText('Remove'));

    expect(defaultProps.onRemove).toHaveBeenCalledWith('user-123');
  });

  it('should close confirm dialog on cancel', async () => {
    const user = userEvent.setup();

    render(<MemberDetailPanel {...defaultProps} />);

    await user.click(screen.getByText('Remove Member'));
    await user.click(screen.getByText('Cancel'));

    expect(defaultProps.onRemove).not.toHaveBeenCalled();
  });
});
