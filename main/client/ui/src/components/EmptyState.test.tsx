// main/client/ui/src/components/EmptyState.test.tsx
/** @vitest-environment jsdom */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import { EmptyState } from './EmptyState';

describe('EmptyState', () => {
  it('renders title', () => {
    render(<EmptyState title="No items yet" />);

    expect(screen.getByText('No items yet')).toBeInTheDocument();
  });

  it('renders with empty-state class', () => {
    render(<EmptyState title="Empty" />);

    const container = screen.getByRole('status');
    expect(container).toHaveClass('empty-state');
  });

  it('renders description when provided', () => {
    render(<EmptyState title="No items" description="Create one to get started" />);

    expect(screen.getByText('Create one to get started')).toBeInTheDocument();
  });

  it('does not render description when omitted', () => {
    render(<EmptyState title="No items" />);

    expect(screen.queryByText('Create one to get started')).not.toBeInTheDocument();
  });

  it('renders icon when provided', () => {
    render(<EmptyState title="No items" icon={<span data-testid="icon">Icon</span>} />);

    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });

  it('renders action button and handles click', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    render(<EmptyState title="No items" action={{ label: 'Create Item', onClick }} />);

    const button = screen.getByRole('button', { name: 'Create Item' });
    expect(button).toBeInTheDocument();

    await user.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('does not render action button when omitted', () => {
    render(<EmptyState title="No items" />);

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<EmptyState title="No items" className="custom-empty" />);

    const container = screen.getByRole('status');
    expect(container).toHaveClass('empty-state');
    expect(container).toHaveClass('custom-empty');
  });

  it('renders all elements together', () => {
    render(
      <EmptyState
        icon={<span data-testid="icon">Icon</span>}
        title="All caught up"
        description="No new notifications"
        action={{ label: 'Refresh', onClick: vi.fn() }}
      />,
    );

    expect(screen.getByTestId('icon')).toBeInTheDocument();
    expect(screen.getByText('All caught up')).toBeInTheDocument();
    expect(screen.getByText('No new notifications')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Refresh' })).toBeInTheDocument();
  });
});
