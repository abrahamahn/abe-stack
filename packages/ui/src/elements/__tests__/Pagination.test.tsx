// packages/ui/src/elements/__tests__/Pagination.test.tsx
/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { Pagination } from '../Pagination';

describe('Pagination', () => {
  describe('happy path', () => {
    it('renders all page buttons', () => {
      render(<Pagination totalPages={5} />);

      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText('4')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getByText('‹')).toBeInTheDocument();
      expect(screen.getByText('›')).toBeInTheDocument();
    });

    it('marks first page as active by default', () => {
      render(<Pagination totalPages={3} />);

      const page1 = screen.getByText('1');
      expect(page1).toHaveAttribute('data-active', 'true');
      expect(screen.getByText('2')).toHaveAttribute('data-active', 'false');
      expect(screen.getByText('3')).toHaveAttribute('data-active', 'false');
    });

    it('navigates to next page with userEvent', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();

      render(<Pagination totalPages={3} defaultValue={1} onChange={onChange} />);

      const nextButton = screen.getByText('›');
      await user.click(nextButton);

      expect(onChange).toHaveBeenCalledWith(2);
    });

    it('navigates to previous page with userEvent', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();

      render(<Pagination totalPages={3} defaultValue={2} onChange={onChange} />);

      const prevButton = screen.getByText('‹');
      await user.click(prevButton);

      expect(onChange).toHaveBeenCalledWith(1);
    });

    it('navigates directly to specific page', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();

      render(<Pagination totalPages={5} defaultValue={1} onChange={onChange} />);

      const page3 = screen.getByText('3');
      await user.click(page3);

      expect(onChange).toHaveBeenCalledWith(3);
    });

    it('disables prev button on first page', () => {
      render(<Pagination totalPages={3} defaultValue={1} />);

      const prevButton = screen.getByText('‹');
      expect(prevButton).toBeDisabled();
    });

    it('disables next button on last page', () => {
      render(<Pagination totalPages={3} defaultValue={3} />);

      const nextButton = screen.getByText('›');
      expect(nextButton).toBeDisabled();
    });

    it('respects defaultValue prop', () => {
      render(<Pagination totalPages={5} defaultValue={3} />);

      const page3 = screen.getByText('3');
      expect(page3).toHaveAttribute('data-active', 'true');
    });
  });

  describe('edge cases - missing/invalid props', () => {
    it('handles null onChange gracefully', async () => {
      const user = userEvent.setup();

      render(
        // @ts-expect-error Testing invalid prop
        <Pagination totalPages={3} onChange={null} />,
      );

      const page2 = screen.getByText('2');
      await expect(user.click(page2)).resolves.not.toThrow();
    });

    it('handles undefined onChange gracefully', async () => {
      const user = userEvent.setup();

      render(<Pagination totalPages={3} onChange={undefined} />);

      const page2 = screen.getByText('2');
      await user.click(page2);

      // Should not crash
      expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('handles 1 page', () => {
      render(<Pagination totalPages={1} />);

      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('‹')).toBeDisabled();
      expect(screen.getByText('›')).toBeDisabled();
    });

    it('handles 0 pages', () => {
      render(<Pagination totalPages={0} />);

      // Should render prev/next buttons but no page buttons
      expect(screen.getByText('‹')).toBeInTheDocument();
      expect(screen.getByText('›')).toBeInTheDocument();
    });

    it('handles defaultValue beyond totalPages', () => {
      render(<Pagination totalPages={3} defaultValue={10} />);

      // Component doesn't clamp - uses value as-is (page 10 doesn't exist in DOM)
      // All visible pages should be inactive
      const page1 = screen.getByText('1');
      const page2 = screen.getByText('2');
      const page3 = screen.getByText('3');
      expect(page1).toHaveAttribute('data-active', 'false');
      expect(page2).toHaveAttribute('data-active', 'false');
      expect(page3).toHaveAttribute('data-active', 'false');
    });

    it('handles defaultValue of 0', () => {
      render(<Pagination totalPages={3} defaultValue={0} />);

      // Component uses 0 as-is (0 ?? 1 evaluates to 0, not 1)
      // Page 0 doesn't exist in DOM, so all visible pages should be inactive
      const page1 = screen.getByText('1');
      const page2 = screen.getByText('2');
      const page3 = screen.getByText('3');
      expect(page1).toHaveAttribute('data-active', 'false');
      expect(page2).toHaveAttribute('data-active', 'false');
      expect(page3).toHaveAttribute('data-active', 'false');
    });

    it('handles negative defaultValue', () => {
      render(<Pagination totalPages={3} defaultValue={-5} />);

      // Component uses -5 as-is (no clamping to valid range)
      // Page -5 doesn't exist in DOM, so all visible pages should be inactive
      const page1 = screen.getByText('1');
      const page2 = screen.getByText('2');
      const page3 = screen.getByText('3');
      expect(page1).toHaveAttribute('data-active', 'false');
      expect(page2).toHaveAttribute('data-active', 'false');
      expect(page3).toHaveAttribute('data-active', 'false');
    });
  });

  describe('edge cases - boundary conditions', () => {
    it('handles rapid page clicks', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();

      render(<Pagination totalPages={5} defaultValue={1} onChange={onChange} />);

      const page3 = screen.getByText('3');

      // Click 10 times rapidly
      for (let i = 0; i < 10; i++) {
        await user.click(page3);
      }

      expect(onChange).toHaveBeenCalledTimes(10);
      expect(onChange).toHaveBeenCalledWith(3);
    });

    it('handles rapid next button clicks', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();

      render(<Pagination totalPages={10} defaultValue={1} onChange={onChange} />);

      const nextButton = screen.getByText('›');

      // Click next 5 times
      for (let i = 0; i < 5; i++) {
        await user.click(nextButton);
      }

      // Should be called with 2, 3, 4, 5, 6 (but won't update UI without controlled state)
      expect(onChange).toHaveBeenCalledTimes(5);
    });

    it('handles clicking disabled prev button', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();

      render(<Pagination totalPages={3} defaultValue={1} onChange={onChange} />);

      const prevButton = screen.getByText('‹');
      expect(prevButton).toBeDisabled();

      // Clicking disabled button should not trigger onChange
      await user.click(prevButton);
      expect(onChange).not.toHaveBeenCalled();
    });

    it('handles clicking disabled next button', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();

      render(<Pagination totalPages={3} defaultValue={3} onChange={onChange} />);

      const nextButton = screen.getByText('›');
      expect(nextButton).toBeDisabled();

      await user.click(nextButton);
      expect(onChange).not.toHaveBeenCalled();
    });

    it('handles clicking same page multiple times', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();

      render(<Pagination totalPages={3} defaultValue={2} onChange={onChange} />);

      const page2 = screen.getByText('2');

      await user.click(page2);
      await user.click(page2);
      await user.click(page2);

      expect(onChange).toHaveBeenCalledTimes(3);
      expect(onChange).toHaveBeenCalledWith(2);
    });

    it('handles many pages (50 pages)', () => {
      render(<Pagination totalPages={50} defaultValue={25} />);

      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('25')).toBeInTheDocument();
      expect(screen.getByText('50')).toBeInTheDocument();
    });

    it('handles alternating onClick callbacks', async () => {
      const user = userEvent.setup();
      const onChange1 = vi.fn();
      const onChange2 = vi.fn();

      const { rerender } = render(<Pagination totalPages={5} onChange={onChange1} />);

      const page2 = screen.getByText('2');
      await user.click(page2);

      expect(onChange1).toHaveBeenCalledWith(2);
      expect(onChange2).not.toHaveBeenCalled();

      // Change callback
      rerender(<Pagination totalPages={5} onChange={onChange2} />);

      const page3 = screen.getByText('3');
      await user.click(page3);

      expect(onChange1).toHaveBeenCalledTimes(1); // Still 1
      expect(onChange2).toHaveBeenCalledWith(3); // Now called
    });
  });

  describe('keyboard interactions', () => {
    it('page buttons respond to Enter key', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();

      render(<Pagination totalPages={3} onChange={onChange} />);

      const page2 = screen.getByText('2');
      page2.focus();
      await user.keyboard('{Enter}');

      expect(onChange).toHaveBeenCalledWith(2);
    });

    it('page buttons respond to Space key', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();

      render(<Pagination totalPages={3} onChange={onChange} />);

      const page3 = screen.getByText('3');
      page3.focus();
      await user.keyboard(' ');

      expect(onChange).toHaveBeenCalledWith(3);
    });

    it('prev button responds to Enter key', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();

      render(<Pagination totalPages={3} defaultValue={2} onChange={onChange} />);

      const prevButton = screen.getByText('‹');
      prevButton.focus();
      await user.keyboard('{Enter}');

      expect(onChange).toHaveBeenCalledWith(1);
    });

    it('next button responds to Enter key', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();

      render(<Pagination totalPages={3} defaultValue={1} onChange={onChange} />);

      const nextButton = screen.getByText('›');
      nextButton.focus();
      await user.keyboard('{Enter}');

      expect(onChange).toHaveBeenCalledWith(2);
    });

    it('supports Tab navigation through all buttons', async () => {
      const user = userEvent.setup();

      // Start on page 2 so neither prev nor next are disabled
      render(<Pagination totalPages={3} defaultValue={2} />);

      // Tab through all buttons
      await user.tab(); // prev button (not disabled)
      expect(screen.getByText('‹')).toHaveFocus();

      await user.tab(); // page 1
      expect(screen.getByText('1')).toHaveFocus();

      await user.tab(); // page 2
      expect(screen.getByText('2')).toHaveFocus();

      await user.tab(); // page 3
      expect(screen.getByText('3')).toHaveFocus();

      await user.tab(); // next button (not disabled)
      expect(screen.getByText('›')).toHaveFocus();
    });
  });

  describe('mouse interactions', () => {
    it('handles double-click on page button', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();

      render(<Pagination totalPages={3} onChange={onChange} />);

      const page2 = screen.getByText('2');
      await user.dblClick(page2);

      // Double-click should trigger two click events
      expect(onChange).toHaveBeenCalledTimes(2);
      expect(onChange).toHaveBeenCalledWith(2);
    });

    it('handles double-click on next button', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();

      render(<Pagination totalPages={5} defaultValue={1} onChange={onChange} />);

      const nextButton = screen.getByText('›');
      await user.dblClick(nextButton);

      expect(onChange).toHaveBeenCalledTimes(2);
    });
  });

  describe('controlled vs uncontrolled', () => {
    it('works in uncontrolled mode with defaultValue', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();

      render(<Pagination totalPages={3} defaultValue={1} onChange={onChange} />);

      const page2 = screen.getByText('2');
      await user.click(page2);

      expect(onChange).toHaveBeenCalledWith(2);
    });

    it('works in controlled mode with value prop', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();

      const { rerender } = render(<Pagination totalPages={3} value={1} onChange={onChange} />);

      expect(screen.getByText('1')).toHaveAttribute('data-active', 'true');

      const page2 = screen.getByText('2');
      await user.click(page2);

      expect(onChange).toHaveBeenCalledWith(2);

      // Parent updates value prop
      rerender(<Pagination totalPages={3} value={2} onChange={onChange} />);

      await waitFor(() => {
        expect(screen.getByText('2')).toHaveAttribute('data-active', 'true');
      });
    });

    it('respects controlled value prop changes', async () => {
      const { rerender } = render(<Pagination totalPages={5} value={1} />);

      expect(screen.getByText('1')).toHaveAttribute('data-active', 'true');

      rerender(<Pagination totalPages={5} value={3} />);

      await waitFor(() => {
        expect(screen.getByText('3')).toHaveAttribute('data-active', 'true');
        expect(screen.getByText('1')).toHaveAttribute('data-active', 'false');
      });
    });
  });

  describe('real-world chaos', () => {
    it('handles rapid page changes via buttons', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();

      render(<Pagination totalPages={10} onChange={onChange} />);

      // Rapidly click different pages
      await user.click(screen.getByText('3'));
      await user.click(screen.getByText('7'));
      await user.click(screen.getByText('2'));
      await user.click(screen.getByText('9'));
      await user.click(screen.getByText('1'));

      expect(onChange).toHaveBeenCalledTimes(5);
      expect(onChange).toHaveBeenNthCalledWith(1, 3);
      expect(onChange).toHaveBeenNthCalledWith(2, 7);
      expect(onChange).toHaveBeenNthCalledWith(3, 2);
      expect(onChange).toHaveBeenNthCalledWith(4, 9);
      expect(onChange).toHaveBeenNthCalledWith(5, 1);
    });

    it('handles rapid mount and unmount', () => {
      for (let i = 0; i < 10; i++) {
        const { unmount } = render(<Pagination totalPages={5} defaultValue={3} />);

        expect(screen.getByText('3')).toHaveAttribute('data-active', 'true');

        unmount();
      }
    });

    it('handles totalPages changing while mounted', () => {
      const { rerender } = render(<Pagination totalPages={3} defaultValue={3} />);

      expect(screen.getByText('3')).toHaveAttribute('data-active', 'true');

      // Reduce totalPages below current page
      rerender(<Pagination totalPages={2} defaultValue={3} />);

      expect(screen.queryByText('3')).not.toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('handles totalPages increasing while mounted', () => {
      const { rerender } = render(<Pagination totalPages={3} defaultValue={2} />);

      expect(screen.getAllByRole('button')).toHaveLength(5); // prev + 3 pages + next

      rerender(<Pagination totalPages={10} defaultValue={2} />);

      expect(screen.getAllByRole('button')).toHaveLength(12); // prev + 10 pages + next
    });
  });

  describe('accessibility', () => {
    it('renders buttons with correct roles', () => {
      render(<Pagination totalPages={3} />);

      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(5); // prev + 3 pages + next
    });

    it('disabled buttons have correct aria state', () => {
      render(<Pagination totalPages={3} defaultValue={1} />);

      const prevButton = screen.getByText('‹');
      expect(prevButton).toBeDisabled();
      expect(prevButton).toHaveAttribute('disabled');
    });

    it('active page has data-active attribute', () => {
      render(<Pagination totalPages={5} defaultValue={3} />);

      const page3 = screen.getByText('3');
      expect(page3).toHaveAttribute('data-active', 'true');

      const page1 = screen.getByText('1');
      expect(page1).toHaveAttribute('data-active', 'false');
    });
  });
});
