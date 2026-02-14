// main/apps/web/src/features/workspace/components/WorkspaceWelcomeBanner.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import { WorkspaceWelcomeBanner } from './WorkspaceWelcomeBanner';

describe('WorkspaceWelcomeBanner', () => {
  const defaultProps = {
    workspaceName: 'Acme Corp',
    onDismiss: vi.fn(),
    onInviteMembers: vi.fn(),
  };

  it('renders with workspace name', () => {
    render(<WorkspaceWelcomeBanner {...defaultProps} />);
    expect(screen.getByText('Welcome to Acme Corp!')).toBeInTheDocument();
  });

  it('calls onDismiss when Dismiss is clicked', async () => {
    const onDismiss = vi.fn();
    render(<WorkspaceWelcomeBanner {...defaultProps} onDismiss={onDismiss} />);
    await userEvent.click(screen.getByText('Dismiss'));
    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it('calls onInviteMembers when Invite Members is clicked', async () => {
    const onInviteMembers = vi.fn();
    render(<WorkspaceWelcomeBanner {...defaultProps} onInviteMembers={onInviteMembers} />);
    await userEvent.click(screen.getByText('Invite Members'));
    expect(onInviteMembers).toHaveBeenCalledOnce();
  });

  it('shows next steps text', () => {
    render(<WorkspaceWelcomeBanner {...defaultProps} />);
    expect(screen.getByText(/invite team members/i)).toBeInTheDocument();
  });
});
