// packages/ui/src/primitives/__tests__/Pagination.test.tsx
/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Pagination } from '../Pagination';

describe('Pagination', () => {
  it('moves between pages and respects bounds', () => {
    const onChange = vi.fn();
    render(<Pagination totalPages={3} defaultValue={2} onChange={onChange} />);

    const prev = screen.getByText('‹');
    const next = screen.getByText('›');
    expect(prev).not.toBeDisabled();
    expect(next).not.toBeDisabled();

    fireEvent.click(next);
    expect(onChange).toHaveBeenCalledWith(3);

    fireEvent.click(prev);
    expect(onChange).toHaveBeenCalledWith(2);

    fireEvent.click(screen.getByText('1'));
    expect(onChange).toHaveBeenCalledWith(1);
  });

  it('disables prev/next at the edges', () => {
    const { unmount } = render(<Pagination totalPages={2} defaultValue={1} />);
    expect(screen.getByText('‹')).toBeDisabled();
    expect(screen.getByText('›')).not.toBeDisabled();

    unmount();
    render(<Pagination totalPages={2} defaultValue={2} />);
    expect(screen.getByText('‹')).not.toBeDisabled();
    expect(screen.getByText('›')).toBeDisabled();
  });
});
