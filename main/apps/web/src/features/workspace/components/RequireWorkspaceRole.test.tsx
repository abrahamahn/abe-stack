// main/apps/web/src/features/workspace/components/RequireWorkspaceRole.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it, beforeEach, afterEach } from 'vitest';

import { meetsRoleRequirement, RequireWorkspaceRole } from './RequireWorkspaceRole';

describe('RequireWorkspaceRole', () => {
  it('renders children when role meets requirement', () => {
    render(
      <RequireWorkspaceRole requiredRole="admin" tenantRole="owner">
        <span data-testid="content">Admin content</span>
      </RequireWorkspaceRole>,
    );

    expect(screen.getByTestId('content')).toBeInTheDocument();
  });

  it('renders children when role equals requirement', () => {
    render(
      <RequireWorkspaceRole requiredRole="member" tenantRole="member">
        <span data-testid="content">Member content</span>
      </RequireWorkspaceRole>,
    );

    expect(screen.getByTestId('content')).toBeInTheDocument();
  });

  it('renders nothing when role is insufficient', () => {
    const { container } = render(
      <RequireWorkspaceRole requiredRole="admin" tenantRole="member">
        <span data-testid="content">Admin only</span>
      </RequireWorkspaceRole>,
    );

    expect(screen.queryByTestId('content')).not.toBeInTheDocument();
    expect(container.innerHTML).toBe('');
  });

  it('renders fallback when role is insufficient', () => {
    render(
      <RequireWorkspaceRole
        requiredRole="owner"
        tenantRole="admin"
        fallback={<span data-testid="denied">Access denied</span>}
      >
        <span data-testid="content">Owner only</span>
      </RequireWorkspaceRole>,
    );

    expect(screen.queryByTestId('content')).not.toBeInTheDocument();
    expect(screen.getByTestId('denied')).toBeInTheDocument();
  });

  it('renders nothing when tenant role is null', () => {
    const { container } = render(
      <RequireWorkspaceRole requiredRole="viewer" tenantRole={null}>
        <span>Content</span>
      </RequireWorkspaceRole>,
    );

    expect(container.innerHTML).toBe('');
  });

  it('renders nothing when tenant role is undefined', () => {
    const { container } = render(
      <RequireWorkspaceRole requiredRole="viewer">
        <span>Content</span>
      </RequireWorkspaceRole>,
    );

    expect(container.innerHTML).toBe('');
  });
});

describe('meetsRoleRequirement', () => {
  it('returns true when role meets requirement', () => {
    expect(meetsRoleRequirement('owner', 'admin')).toBe(true);
    expect(meetsRoleRequirement('admin', 'admin')).toBe(true);
    expect(meetsRoleRequirement('member', 'viewer')).toBe(true);
  });

  it('returns false when role is insufficient', () => {
    expect(meetsRoleRequirement('member', 'admin')).toBe(false);
    expect(meetsRoleRequirement('viewer', 'member')).toBe(false);
  });

  it('returns false for null/undefined role', () => {
    expect(meetsRoleRequirement(null, 'viewer')).toBe(false);
    expect(meetsRoleRequirement(undefined, 'viewer')).toBe(false);
  });
});
