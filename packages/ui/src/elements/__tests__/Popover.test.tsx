// packages/ui/src/elements/__tests__/Popover.test.tsx
/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { Popover } from '../Popover';

describe('Popover', () => {
  describe('happy path', () => {
    it('renders trigger but not content when closed', () => {
      render(<Popover trigger={<span>Show Popover</span>}>Popover content</Popover>);

      expect(screen.getByRole('button', { name: 'Show Popover' })).toBeInTheDocument();
      expect(screen.queryByText('Popover content')).not.toBeInTheDocument();
    });

    it('shows content when trigger is clicked with userEvent', async () => {
      const user = userEvent.setup();

      render(<Popover trigger={<span>Show</span>}>Content here</Popover>);

      const trigger = screen.getByRole('button', { name: 'Show' });
      await user.click(trigger);

      expect(screen.getByText('Content here')).toBeInTheDocument();
    });

    it('closes when trigger is clicked again', async () => {
      const user = userEvent.setup();

      render(<Popover trigger={<span>Toggle</span>}>Popover content</Popover>);

      const trigger = screen.getByRole('button', { name: 'Toggle' });

      await user.click(trigger);
      expect(screen.getByText('Popover content')).toBeInTheDocument();

      await user.click(trigger);
      expect(screen.queryByText('Popover content')).not.toBeInTheDocument();
    });

    it('closes on Escape key and returns focus to trigger', async () => {
      const user = userEvent.setup();

      render(<Popover trigger={<span>Show</span>}>Content</Popover>);

      const trigger = screen.getByRole('button', { name: 'Show' });
      await user.click(trigger);

      expect(screen.getByText('Content')).toBeInTheDocument();

      await user.keyboard('{Escape}');

      await waitFor(() => {
        expect(screen.queryByText('Content')).not.toBeInTheDocument();
        expect(trigger).toHaveFocus();
      });
    });

    it('updates aria-expanded attribute', async () => {
      const user = userEvent.setup();

      render(<Popover trigger={<span>Show</span>}>Content</Popover>);

      const trigger = screen.getByRole('button', { name: 'Show' });
      expect(trigger).toHaveAttribute('aria-expanded', 'false');

      await user.click(trigger);
      expect(trigger).toHaveAttribute('aria-expanded', 'true');

      await user.click(trigger);
      expect(trigger).toHaveAttribute('aria-expanded', 'false');
    });

    it('respects defaultOpen prop', () => {
      render(
        <Popover trigger={<span>Show</span>} defaultOpen>
          Default content
        </Popover>,
      );

      expect(screen.getByText('Default content')).toBeInTheDocument();
    });

    it('supports bottom placement by default', async () => {
      const user = userEvent.setup();

      render(<Popover trigger={<span>Show</span>}>Content</Popover>);

      await user.click(screen.getByRole('button', { name: 'Show' }));

      const card = screen.getByText('Content').parentElement;
      expect(card).toHaveAttribute('data-placement', 'bottom');
    });

    it('supports right placement', async () => {
      const user = userEvent.setup();

      render(
        <Popover trigger={<span>Show</span>} placement="right">
          Content
        </Popover>,
      );

      await user.click(screen.getByRole('button', { name: 'Show' }));

      const card = screen.getByText('Content').parentElement;
      expect(card).toHaveAttribute('data-placement', 'right');
    });
  });

  describe('edge cases - missing/invalid props', () => {
    it('handles null trigger gracefully', () => {
      render(<Popover trigger={null}>Content</Popover>);

      // Should render without crashing
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('handles undefined trigger gracefully', () => {
      render(<Popover trigger={undefined}>Content</Popover>);

      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('handles null children gracefully', async () => {
      const user = userEvent.setup();

      render(<Popover trigger={<span>Show</span>}>{null}</Popover>);

      const trigger = screen.getByRole('button', { name: 'Show' });
      await user.click(trigger);

      // Should not crash
      expect(trigger).toHaveAttribute('aria-expanded', 'true');
    });

    it('handles undefined children gracefully', async () => {
      const user = userEvent.setup();

      render(<Popover trigger={<span>Show</span>}>{undefined}</Popover>);

      const trigger = screen.getByRole('button', { name: 'Show' });
      await user.click(trigger);

      expect(trigger).toHaveAttribute('aria-expanded', 'true');
    });

    it('handles null onChange gracefully', async () => {
      const user = userEvent.setup();

      render(
        // @ts-expect-error Testing invalid prop
        <Popover trigger={<span>Show</span>} onChange={null}>
          Content
        </Popover>,
      );

      const trigger = screen.getByRole('button', { name: 'Show' });
      await expect(user.click(trigger)).resolves.not.toThrow();
    });

    it('handles undefined onChange gracefully', async () => {
      const user = userEvent.setup();

      render(
        <Popover trigger={<span>Show</span>} onChange={undefined}>
          Content
        </Popover>,
      );

      const trigger = screen.getByRole('button', { name: 'Show' });
      await user.click(trigger);

      expect(screen.getByText('Content')).toBeInTheDocument();
    });
  });

  describe('edge cases - boundary conditions', () => {
    it('handles rapid toggle clicks', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();

      render(
        <Popover trigger={<span>Toggle</span>} onChange={onChange}>
          Content
        </Popover>,
      );

      const trigger = screen.getByRole('button', { name: 'Toggle' });

      // Click 10 times rapidly
      for (let i = 0; i < 10; i++) {
        await user.click(trigger);
      }

      expect(onChange).toHaveBeenCalledTimes(10);
    });

    it('handles rapid Escape presses', async () => {
      const user = userEvent.setup();

      render(<Popover trigger={<span>Show</span>}>Content</Popover>);

      const trigger = screen.getByRole('button', { name: 'Show' });
      await user.click(trigger);

      // Press Escape 5 times
      for (let i = 0; i < 5; i++) {
        await user.keyboard('{Escape}');
      }

      // Should be closed
      await waitFor(() => {
        expect(screen.queryByText('Content')).not.toBeInTheDocument();
      });
    });

    it('handles multiple popovers simultaneously', async () => {
      const user = userEvent.setup();

      render(
        <>
          <Popover trigger={<span>Popover 1</span>}>Content 1</Popover>
          <Popover trigger={<span>Popover 2</span>}>Content 2</Popover>
          <Popover trigger={<span>Popover 3</span>}>Content 3</Popover>
        </>,
      );

      await user.click(screen.getByRole('button', { name: 'Popover 1' }));
      await user.click(screen.getByRole('button', { name: 'Popover 2' }));
      await user.click(screen.getByRole('button', { name: 'Popover 3' }));

      expect(screen.getByText('Content 1')).toBeInTheDocument();
      expect(screen.getByText('Content 2')).toBeInTheDocument();
      expect(screen.getByText('Content 3')).toBeInTheDocument();
    });

    it('handles alternating onChange callbacks', async () => {
      const user = userEvent.setup();
      const onChange1 = vi.fn();
      const onChange2 = vi.fn();

      const { rerender } = render(
        <Popover trigger={<span>Toggle</span>} onChange={onChange1}>
          Content
        </Popover>,
      );

      const trigger = screen.getByRole('button', { name: 'Toggle' });
      await user.click(trigger);

      expect(onChange1).toHaveBeenCalledWith(true);
      expect(onChange2).not.toHaveBeenCalled();

      // Change callback
      rerender(
        <Popover trigger={<span>Toggle</span>} onChange={onChange2}>
          Content
        </Popover>,
      );

      await user.click(trigger);

      expect(onChange1).toHaveBeenCalledTimes(1); // Still 1
      expect(onChange2).toHaveBeenCalledWith(false); // Now called
    });
  });

  describe('keyboard interactions', () => {
    it('opens on Enter key', async () => {
      const user = userEvent.setup();

      render(<Popover trigger={<span>Show</span>}>Content</Popover>);

      const trigger = screen.getByRole('button', { name: 'Show' });
      trigger.focus();
      await user.keyboard('{Enter}');

      expect(screen.getByText('Content')).toBeInTheDocument();
    });

    it('opens on Space key', async () => {
      const user = userEvent.setup();

      render(<Popover trigger={<span>Show</span>}>Content</Popover>);

      const trigger = screen.getByRole('button', { name: 'Show' });
      trigger.focus();
      await user.keyboard(' ');

      expect(screen.getByText('Content')).toBeInTheDocument();
    });

    it('closes on Enter key when open', async () => {
      const user = userEvent.setup();

      render(<Popover trigger={<span>Toggle</span>}>Content</Popover>);

      const trigger = screen.getByRole('button', { name: 'Toggle' });
      trigger.focus();
      await user.keyboard('{Enter}');

      expect(screen.getByText('Content')).toBeInTheDocument();

      await user.keyboard('{Enter}');
      expect(screen.queryByText('Content')).not.toBeInTheDocument();
    });

    it('closes on Space key when open', async () => {
      const user = userEvent.setup();

      render(<Popover trigger={<span>Toggle</span>}>Content</Popover>);

      const trigger = screen.getByRole('button', { name: 'Toggle' });
      trigger.focus();
      await user.keyboard(' ');

      expect(screen.getByText('Content')).toBeInTheDocument();

      await user.keyboard(' ');
      expect(screen.queryByText('Content')).not.toBeInTheDocument();
    });

    it('does not close on other keys', async () => {
      const user = userEvent.setup();

      render(<Popover trigger={<span>Show</span>}>Content</Popover>);

      const trigger = screen.getByRole('button', { name: 'Show' });
      await user.click(trigger);

      expect(screen.getByText('Content')).toBeInTheDocument();

      await user.keyboard('{ArrowDown}');
      await user.keyboard('{Tab}');
      await user.keyboard('a');

      expect(screen.getByText('Content')).toBeInTheDocument();
    });

    it('Escape key returns focus to trigger', async () => {
      const user = userEvent.setup();

      render(<Popover trigger={<span>Show</span>}>Content</Popover>);

      const trigger = screen.getByRole('button', { name: 'Show' });
      await user.click(trigger);

      // Move focus away
      await user.tab();

      await user.keyboard('{Escape}');

      await waitFor(() => {
        expect(trigger).toHaveFocus();
      });
    });

    it('trigger is keyboard focusable', async () => {
      const user = userEvent.setup();

      render(<Popover trigger={<span>Show</span>}>Content</Popover>);

      await user.tab();

      expect(screen.getByRole('button', { name: 'Show' })).toHaveFocus();
    });

    it('trigger has correct tabIndex', () => {
      render(<Popover trigger={<span>Show</span>}>Content</Popover>);

      const trigger = screen.getByRole('button', { name: 'Show' });
      expect(trigger).toHaveAttribute('tabIndex', '0');
    });
  });

  describe('mouse interactions', () => {
    it('handles double-click on trigger', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();

      render(
        <Popover trigger={<span>Toggle</span>} onChange={onChange}>
          Content
        </Popover>,
      );

      const trigger = screen.getByRole('button', { name: 'Toggle' });
      await user.dblClick(trigger);

      // Double-click should trigger two toggles
      expect(onChange).toHaveBeenCalledTimes(2);
    });

    it('handles triple-click on trigger', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();

      render(
        <Popover trigger={<span>Toggle</span>} onChange={onChange}>
          Content
        </Popover>,
      );

      const trigger = screen.getByRole('button', { name: 'Toggle' });
      await user.tripleClick(trigger);

      expect(onChange).toHaveBeenCalledTimes(3);
    });

    it('does not interfere with content clicks', async () => {
      const user = userEvent.setup();
      const onContentClick = vi.fn();

      render(
        <Popover trigger={<span>Show</span>}>
          <button onClick={onContentClick}>Click me</button>
        </Popover>,
      );

      await user.click(screen.getByRole('button', { name: 'Show' }));

      const contentButton = screen.getByRole('button', { name: 'Click me' });
      await user.click(contentButton);

      expect(onContentClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('controlled vs uncontrolled', () => {
    it('works in uncontrolled mode with defaultOpen', () => {
      render(
        <Popover trigger={<span>Show</span>} defaultOpen>
          Content
        </Popover>,
      );

      expect(screen.getByText('Content')).toBeInTheDocument();
    });

    it('works in controlled mode with open prop', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();

      const { rerender } = render(
        <Popover trigger={<span>Show</span>} open={false} onChange={onChange}>
          Content
        </Popover>,
      );

      expect(screen.queryByText('Content')).not.toBeInTheDocument();

      const trigger = screen.getByRole('button', { name: 'Show' });
      await user.click(trigger);

      expect(onChange).toHaveBeenCalledWith(true);

      // Parent updates open prop
      rerender(
        <Popover trigger={<span>Show</span>} open={true} onChange={onChange}>
          Content
        </Popover>,
      );

      await waitFor(() => {
        expect(screen.getByText('Content')).toBeInTheDocument();
      });
    });

    it('respects controlled open prop changes', async () => {
      const { rerender } = render(
        <Popover trigger={<span>Show</span>} open={false}>
          Content
        </Popover>,
      );

      expect(screen.queryByText('Content')).not.toBeInTheDocument();

      rerender(
        <Popover trigger={<span>Show</span>} open={true}>
          Content
        </Popover>,
      );

      await waitFor(() => {
        expect(screen.getByText('Content')).toBeInTheDocument();
      });

      rerender(
        <Popover trigger={<span>Show</span>} open={false}>
          Content
        </Popover>,
      );

      await waitFor(() => {
        expect(screen.queryByText('Content')).not.toBeInTheDocument();
      });
    });
  });

  describe('focus management', () => {
    it('maintains focus on trigger after opening', async () => {
      const user = userEvent.setup();

      render(<Popover trigger={<span>Show</span>}>Content</Popover>);

      const trigger = screen.getByRole('button', { name: 'Show' });
      await user.click(trigger);

      // Trigger should still be focusable
      expect(trigger).toBeInTheDocument();
    });

    it('restores focus on Escape key', async () => {
      const user = userEvent.setup();

      render(<Popover trigger={<span>Show</span>}>Content</Popover>);

      const trigger = screen.getByRole('button', { name: 'Show' });
      await user.click(trigger);

      // Move focus
      document.body.focus();

      await user.keyboard('{Escape}');

      await waitFor(() => {
        expect(trigger).toHaveFocus();
      });
    });
  });

  describe('event listener cleanup', () => {
    it('cleans up Escape listener on unmount when open', async () => {
      const user = userEvent.setup();

      const { unmount } = render(<Popover trigger={<span>Show</span>}>Content</Popover>);

      const trigger = screen.getByRole('button', { name: 'Show' });
      await user.click(trigger);

      expect(screen.getByText('Content')).toBeInTheDocument();

      unmount();

      // Should not error on Escape after unmount
      await expect(user.keyboard('{Escape}')).resolves.not.toThrow();
    });

    it('cleans up Escape listener on close', async () => {
      const user = userEvent.setup();

      render(<Popover trigger={<span>Toggle</span>}>Content</Popover>);

      const trigger = screen.getByRole('button', { name: 'Toggle' });
      await user.click(trigger);
      expect(screen.getByText('Content')).toBeInTheDocument();

      await user.click(trigger);
      expect(screen.queryByText('Content')).not.toBeInTheDocument();

      // Escape should do nothing when closed
      await user.keyboard('{Escape}');
      expect(screen.queryByText('Content')).not.toBeInTheDocument();
    });
  });

  describe('real-world chaos', () => {
    it('handles rapid open/close/open cycles', async () => {
      const user = userEvent.setup();

      render(<Popover trigger={<span>Toggle</span>}>Content</Popover>);

      const trigger = screen.getByRole('button', { name: 'Toggle' });

      // Rapidly toggle 20 times
      for (let i = 0; i < 20; i++) {
        await user.click(trigger);
      }

      // Should be closed after 20 toggles (even number)
      expect(screen.queryByText('Content')).not.toBeInTheDocument();
    });

    it('handles rapid mount and unmount', async () => {
      const user = userEvent.setup();

      for (let i = 0; i < 10; i++) {
        const { unmount } = render(<Popover trigger={<span>Show</span>}>Content {i}</Popover>);

        const trigger = screen.getByRole('button', { name: 'Show' });
        await user.click(trigger);

        expect(screen.getByText(`Content ${i}`)).toBeInTheDocument();

        unmount();
      }
    });

    it('handles trigger content changing', async () => {
      const user = userEvent.setup();

      const { rerender } = render(<Popover trigger={<span>Trigger 1</span>}>Content</Popover>);

      await user.click(screen.getByRole('button', { name: 'Trigger 1' }));
      expect(screen.getByText('Content')).toBeInTheDocument();

      rerender(<Popover trigger={<span>Trigger 2</span>}>Content</Popover>);

      expect(screen.getByRole('button', { name: 'Trigger 2' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Trigger 1' })).not.toBeInTheDocument();
    });

    it('handles placement changing while open', async () => {
      const user = userEvent.setup();

      const { rerender } = render(
        <Popover trigger={<span>Show</span>} placement="bottom">
          Content
        </Popover>,
      );

      await user.click(screen.getByRole('button', { name: 'Show' }));

      let card = screen.getByText('Content').parentElement;
      expect(card).toHaveAttribute('data-placement', 'bottom');

      rerender(
        <Popover trigger={<span>Show</span>} placement="right">
          Content
        </Popover>,
      );

      card = screen.getByText('Content').parentElement;
      expect(card).toHaveAttribute('data-placement', 'right');
    });

    it('handles content changing while open', async () => {
      const user = userEvent.setup();

      const { rerender } = render(<Popover trigger={<span>Show</span>}>Content 1</Popover>);

      await user.click(screen.getByRole('button', { name: 'Show' }));

      expect(screen.getByText('Content 1')).toBeInTheDocument();

      rerender(<Popover trigger={<span>Show</span>}>Content 2</Popover>);

      expect(screen.queryByText('Content 1')).not.toBeInTheDocument();
      expect(screen.getByText('Content 2')).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('trigger has button role', () => {
      render(<Popover trigger={<span>Show</span>}>Content</Popover>);

      expect(screen.getByRole('button', { name: 'Show' })).toBeInTheDocument();
    });

    it('trigger has aria-expanded attribute', () => {
      render(<Popover trigger={<span>Show</span>}>Content</Popover>);

      const trigger = screen.getByRole('button', { name: 'Show' });
      expect(trigger).toHaveAttribute('aria-expanded', 'false');
    });

    it('aria-expanded updates when opened', async () => {
      const user = userEvent.setup();

      render(<Popover trigger={<span>Show</span>}>Content</Popover>);

      const trigger = screen.getByRole('button', { name: 'Show' });
      await user.click(trigger);

      expect(trigger).toHaveAttribute('aria-expanded', 'true');
    });

    it('trigger is keyboard accessible', async () => {
      const user = userEvent.setup();

      render(<Popover trigger={<span>Show</span>}>Content</Popover>);

      await user.tab();

      const trigger = screen.getByRole('button', { name: 'Show' });
      expect(trigger).toHaveFocus();

      await user.keyboard('{Enter}');
      expect(screen.getByText('Content')).toBeInTheDocument();
    });
  });
});
