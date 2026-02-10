// src/apps/web/src/features/workspace/components/Can.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Can } from './Can';

describe('Can', () => {
  it('renders children when permission is granted', () => {
    render(
      <Can action="write" resource="tenant" tenantRole="owner">
        <span data-testid="allowed">Allowed</span>
      </Can>,
    );

    expect(screen.getByTestId('allowed')).toBeInTheDocument();
  });

  it('renders nothing when permission is denied', () => {
    const { container } = render(
      <Can action="write" resource="tenant" tenantRole="member">
        <span data-testid="allowed">Allowed</span>
      </Can>,
    );

    expect(screen.queryByTestId('allowed')).not.toBeInTheDocument();
    expect(container.innerHTML).toBe('');
  });

  it('renders fallback when permission is denied', () => {
    render(
      <Can
        action="manage"
        resource="billing"
        tenantRole="member"
        fallback={<span data-testid="denied">No access</span>}
      >
        <span data-testid="allowed">Billing</span>
      </Can>,
    );

    expect(screen.queryByTestId('allowed')).not.toBeInTheDocument();
    expect(screen.getByTestId('denied')).toBeInTheDocument();
  });

  it('allows platform admin for any action', () => {
    render(
      <Can action="manage" resource="billing" appRole="admin">
        <span data-testid="admin-allowed">Admin Access</span>
      </Can>,
    );

    expect(screen.getByTestId('admin-allowed')).toBeInTheDocument();
  });

  it('handles data ownership with isOwner', () => {
    render(
      <Can action="write" resource="data" tenantRole="member" isOwner={true}>
        <span data-testid="owner-edit">Edit own data</span>
      </Can>,
    );

    expect(screen.getByTestId('owner-edit')).toBeInTheDocument();
  });

  it('denies when no tenant role is provided', () => {
    const { container } = render(
      <Can action="read" resource="tenant">
        <span>Visible</span>
      </Can>,
    );

    expect(container.innerHTML).toBe('');
  });
});
