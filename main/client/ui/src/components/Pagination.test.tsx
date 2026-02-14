// main/client/ui/src/components/Pagination.test.tsx
// client/ui/src/elements/__tests__/Pagination.test.tsx
/** @vitest-environment jsdom */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import { Pagination } from './Pagination';

describe('Pagination', () => {
  it('renders page buttons with active state', () => {
    render(<Pagination totalPages={5} defaultValue={2} />);

    expect(screen.getByText('1')).toHaveAttribute('data-active', 'false');
    expect(screen.getByText('2')).toHaveAttribute('data-active', 'true');
    expect(screen.getByText('‹')).toBeInTheDocument();
    expect(screen.getByText('›')).toBeInTheDocument();
  });

  it('navigates with prev/next buttons and direct page clicks', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<Pagination totalPages={5} defaultValue={2} onChange={onChange} />);

    await user.click(screen.getByText('›'));
    expect(onChange).toHaveBeenCalledWith(3);

    await user.click(screen.getByText('‹'));
    expect(onChange).toHaveBeenCalledWith(2);

    await user.click(screen.getByText('5'));
    expect(onChange).toHaveBeenCalledWith(5);
  });

  it('disables prev on first page and next on last page', () => {
    const { rerender } = render(<Pagination totalPages={3} value={1} />);
    expect(screen.getByText('‹')).toBeDisabled();
    expect(screen.getByText('›')).not.toBeDisabled();

    rerender(<Pagination totalPages={3} value={3} />);
    expect(screen.getByText('‹')).not.toBeDisabled();
    expect(screen.getByText('›')).toBeDisabled();
  });

  it('works in controlled mode', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    const { rerender } = render(<Pagination totalPages={3} value={1} onChange={onChange} />);
    expect(screen.getByText('1')).toHaveAttribute('data-active', 'true');

    await user.click(screen.getByText('2'));
    expect(onChange).toHaveBeenCalledWith(2);

    rerender(<Pagination totalPages={3} value={2} onChange={onChange} />);
    await waitFor(() => {
      expect(screen.getByText('2')).toHaveAttribute('data-active', 'true');
    });
  });

  it('handles edge cases: 0 pages, 1 page', () => {
    const { rerender } = render(<Pagination totalPages={0} />);
    expect(screen.getByText('‹')).toBeInTheDocument();

    rerender(<Pagination totalPages={1} />);
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('‹')).toBeDisabled();
    expect(screen.getByText('›')).toBeDisabled();
  });
});
