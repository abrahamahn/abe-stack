// packages/ui/src/components/Dropdown.test.tsx
// packages/ui/src/elements/__tests__/Dropdown.test.tsx
/** @vitest-environment jsdom */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { MenuItem } from '../elements/MenuItem';

import { Dropdown } from './Dropdown';

describe('Dropdown', () => {
  describe('happy path', () => {
    it('renders closed by default', () => {
      render(
        <Dropdown trigger={<span>Open Menu</span>}>
          <MenuItem>Item 1</MenuItem>
        </Dropdown>,
      );

      expect(screen.queryByText('Item 1')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Open Menu' })).toBeInTheDocument();
    });

    it('opens on trigger click with userEvent', async () => {
      const user = userEvent.setup();

      render(
        <Dropdown trigger={<span>Open Menu</span>}>
          <MenuItem>Item 1</MenuItem>
          <MenuItem>Item 2</MenuItem>
        </Dropdown>,
      );

      expect(screen.queryByText('Item 1')).not.toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Open Menu' }));

      expect(screen.getByText('Item 1')).toBeInTheDocument();
      expect(screen.getByText('Item 2')).toBeInTheDocument();
      expect(screen.getByRole('menu')).toBeInTheDocument();
    });

    it('opens with defaultOpen', () => {
      render(
        <Dropdown trigger={<span>Trigger</span>} defaultOpen>
          <MenuItem>Item 1</MenuItem>
        </Dropdown>,
      );

      expect(screen.getByText('Item 1')).toBeInTheDocument();
    });

    it('works in controlled mode', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();

      const { rerender } = render(
        <Dropdown trigger={<span>Trigger</span>} open={false} onChange={onChange}>
          <MenuItem>Item 1</MenuItem>
        </Dropdown>,
      );

      expect(screen.queryByText('Item 1')).not.toBeInTheDocument();

      await user.click(screen.getByRole('button'));
      expect(onChange).toHaveBeenCalledWith(true);

      // Simulate parent updating the prop
      rerender(
        <Dropdown trigger={<span>Trigger</span>} open={true} onChange={onChange}>
          <MenuItem>Item 1</MenuItem>
        </Dropdown>,
      );

      expect(screen.getByText('Item 1')).toBeInTheDocument();
    });

    it('closes when clicking trigger again', async () => {
      const user = userEvent.setup();

      render(
        <Dropdown trigger={<span>Toggle</span>}>
          <MenuItem>Item 1</MenuItem>
        </Dropdown>,
      );

      const trigger = screen.getByRole('button');

      await user.click(trigger);
      expect(screen.getByText('Item 1')).toBeInTheDocument();

      await user.click(trigger);
      expect(screen.queryByText('Item 1')).not.toBeInTheDocument();
    });

    it('supports function-as-children with close callback', async () => {
      const user = userEvent.setup();

      render(
        <Dropdown trigger={<span>Open</span>}>
          {(close) => (
            <MenuItem
              onClick={() => {
                close();
              }}
            >
              Close Me
            </MenuItem>
          )}
        </Dropdown>,
      );

      await user.click(screen.getByRole('button', { name: 'Open' }));
      expect(screen.getByText('Close Me')).toBeInTheDocument();

      await user.click(screen.getByText('Close Me'));
      expect(screen.queryByText('Close Me')).not.toBeInTheDocument();
    });
  });

  describe('edge cases - missing/invalid props', () => {
    it('renders without onChange handler', async () => {
      const user = userEvent.setup();

      expect(() => {
        render(
          <Dropdown trigger={<span>Open</span>}>
            <MenuItem>Item 1</MenuItem>
          </Dropdown>,
        );
      }).not.toThrow();

      await user.click(screen.getByRole('button'));
      expect(screen.getByText('Item 1')).toBeInTheDocument();
    });

    it('handles null onChange gracefully', async () => {
      const user = userEvent.setup();

      render(
        // @ts-expect-error Testing invalid prop
        <Dropdown trigger={<span>Open</span>} onChange={null}>
          <MenuItem>Item 1</MenuItem>
        </Dropdown>,
      );

      await user.click(screen.getByRole('button'));
      expect(screen.getByText('Item 1')).toBeInTheDocument();
    });

    it('handles undefined defaultOpen', () => {
      render(
        <Dropdown trigger={<span>Open</span>}>
          <MenuItem>Item 1</MenuItem>
        </Dropdown>,
      );

      expect(screen.queryByText('Item 1')).not.toBeInTheDocument();
    });

    it('handles undefined open in controlled mode', () => {
      render(
        <Dropdown trigger={<span>Open</span>}>
          <MenuItem>Item 1</MenuItem>
        </Dropdown>,
      );

      expect(screen.queryByText('Item 1')).not.toBeInTheDocument();
    });

    it('renders with empty children', async () => {
      const user = userEvent.setup();

      render(<Dropdown trigger={<span>Open</span>}>{[]}</Dropdown>);

      await user.click(screen.getByRole('button'));
      expect(screen.getByRole('menu')).toBeInTheDocument();
    });

    it('renders with null children (no menu items)', async () => {
      const user = userEvent.setup();

      render(<Dropdown trigger={<span>Open</span>}>{null}</Dropdown>);

      await user.click(screen.getByRole('button'));
      const menu = screen.getByRole('menu');
      expect(menu).toBeInTheDocument();
      expect(menu).toBeEmptyDOMElement();
    });
  });

  describe('edge cases - placement', () => {
    it('defaults to bottom placement', () => {
      render(
        <Dropdown trigger={<span>Open</span>} defaultOpen>
          <MenuItem>Item 1</MenuItem>
        </Dropdown>,
      );

      const container = document.querySelector('.dropdown');
      expect(container).toHaveAttribute('data-placement', 'bottom');
    });

    it('supports right placement', () => {
      render(
        <Dropdown trigger={<span>Open</span>} placement="right" defaultOpen>
          <MenuItem>Item 1</MenuItem>
        </Dropdown>,
      );

      const container = document.querySelector('.dropdown');
      expect(container).toHaveAttribute('data-placement', 'right');

      const menu = screen.getByRole('menu');
      expect(menu).toHaveAttribute('data-placement', 'right');
    });
  });

  describe('edge cases - boundary conditions', () => {
    it('handles rapid clicking without breaking', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();

      render(
        <Dropdown trigger={<span>Toggle</span>} onChange={onChange}>
          <MenuItem>Item 1</MenuItem>
        </Dropdown>,
      );

      const trigger = screen.getByRole('button');

      // Rapid clicks (20 times)
      for (let i = 0; i < 20; i++) {
        await user.click(trigger);
      }

      expect(onChange).toHaveBeenCalled();
      // Final state should be closed (even number of clicks)
      expect(screen.queryByText('Item 1')).not.toBeInTheDocument();
    });

    it('handles rapid prop changes in controlled mode', () => {
      const { rerender } = render(
        <Dropdown trigger={<span>Open</span>} open={false}>
          <MenuItem>Item 1</MenuItem>
        </Dropdown>,
      );

      // Rapid prop changes
      for (let i = 0; i < 10; i++) {
        rerender(
          <Dropdown trigger={<span>Open</span>} open={i % 2 === 0}>
            <MenuItem>Item 1</MenuItem>
          </Dropdown>,
        );
      }

      // Final state should be closed (even number)
      expect(screen.queryByText('Item 1')).not.toBeInTheDocument();
    });

    it('handles calling close() multiple times rapidly', async () => {
      const user = userEvent.setup();
      let closeFunc: (() => void) | null = null;

      render(
        <Dropdown trigger={<span>Open</span>}>
          {(close) => {
            closeFunc = close;
            return <MenuItem>Item 1</MenuItem>;
          }}
        </Dropdown>,
      );

      await user.click(screen.getByRole('button'));
      expect(screen.getByText('Item 1')).toBeInTheDocument();

      // Call close multiple times rapidly
      await waitFor(() => {
        closeFunc?.();
        closeFunc?.();
        closeFunc?.();
      });

      await waitFor(() => {
        expect(screen.queryByText('Item 1')).not.toBeInTheDocument();
      });
    });
  });

  describe('edge cases - cleanup', () => {
    it('cleans up properly on unmount when open', () => {
      const { unmount } = render(
        <Dropdown trigger={<span>Open</span>} defaultOpen>
          <MenuItem>Item 1</MenuItem>
        </Dropdown>,
      );

      expect(screen.getByText('Item 1')).toBeInTheDocument();

      unmount();

      expect(screen.queryByText('Item 1')).not.toBeInTheDocument();
    });

    it('cleans up properly on unmount when closed', () => {
      const { unmount } = render(
        <Dropdown trigger={<span>Open</span>}>
          <MenuItem>Item 1</MenuItem>
        </Dropdown>,
      );

      expect(screen.queryByText('Item 1')).not.toBeInTheDocument();

      unmount();

      expect(screen.queryByText('Item 1')).not.toBeInTheDocument();
    });

    it('removes keyboard event listeners on unmount', async () => {
      const user = userEvent.setup();
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

      const { unmount } = render(
        <Dropdown trigger={<span>Open</span>}>
          <MenuItem>Item 1</MenuItem>
        </Dropdown>,
      );

      await user.click(screen.getByRole('button'));

      const keydownCalls = addEventListenerSpy.mock.calls.filter((call) => call[0] === 'keydown');
      expect(keydownCalls.length).toBeGreaterThan(0);

      unmount();

      const removeCalls = removeEventListenerSpy.mock.calls.filter((call) => call[0] === 'keydown');
      expect(removeCalls.length).toBeGreaterThan(0);

      addEventListenerSpy.mockRestore();
      removeEventListenerSpy.mockRestore();
    });
  });

  describe('edge cases - special characters', () => {
    it('handles trigger with special characters', async () => {
      const user = userEvent.setup();
      const triggerText = `<script>alert('xss')</script> & chars: <>&"'`;

      render(
        <Dropdown trigger={<span>{triggerText}</span>}>
          <MenuItem>Item 1</MenuItem>
        </Dropdown>,
      );

      const trigger = screen.getByText(/script.*alert.*xss/i);
      expect(trigger.textContent).toContain('<script>');

      await user.click(screen.getByRole('button'));
      expect(screen.getByText('Item 1')).toBeInTheDocument();
    });
  });

  describe('user interactions - keyboard navigation', () => {
    it('opens with Enter key', async () => {
      const user = userEvent.setup();

      render(
        <Dropdown trigger={<span>Open</span>}>
          <MenuItem>Item 1</MenuItem>
        </Dropdown>,
      );

      const trigger = screen.getByRole('button');
      trigger.focus();

      await user.keyboard('{Enter}');

      expect(screen.getByText('Item 1')).toBeInTheDocument();
    });

    it('opens with Space key', async () => {
      const user = userEvent.setup();

      render(
        <Dropdown trigger={<span>Open</span>}>
          <MenuItem>Item 1</MenuItem>
        </Dropdown>,
      );

      const trigger = screen.getByRole('button');
      trigger.focus();

      await user.keyboard(' ');

      expect(screen.getByText('Item 1')).toBeInTheDocument();
    });

    it('closes with Escape key and restores focus to trigger', async () => {
      const user = userEvent.setup();

      render(
        <Dropdown trigger={<span>Open</span>}>
          <MenuItem>Item 1</MenuItem>
        </Dropdown>,
      );

      const trigger = screen.getByRole('button');
      await user.click(trigger);
      expect(screen.getByText('Item 1')).toBeInTheDocument();

      await user.keyboard('{Escape}');

      expect(screen.queryByText('Item 1')).not.toBeInTheDocument();
      expect(trigger).toHaveFocus();
    });

    it('ArrowDown opens menu and focuses first item', async () => {
      const user = userEvent.setup();

      render(
        <Dropdown trigger={<span>Open</span>}>
          <MenuItem>First</MenuItem>
          <MenuItem>Second</MenuItem>
        </Dropdown>,
      );

      const trigger = screen.getByRole('button');
      trigger.focus();

      await user.keyboard('{ArrowDown}');

      expect(screen.getByText('First')).toBeInTheDocument();

      // Menu should be open and first item should be focused
      await user.keyboard('{ArrowDown}');
      const firstItem = screen.getByRole('button', { name: 'First' });
      expect(firstItem).toHaveFocus();
    });

    it('ArrowUp opens menu and focuses last item', async () => {
      const user = userEvent.setup();

      render(
        <Dropdown trigger={<span>Open</span>}>
          <MenuItem>First</MenuItem>
          <MenuItem>Last</MenuItem>
        </Dropdown>,
      );

      const trigger = screen.getByRole('button');
      trigger.focus();

      await user.keyboard('{ArrowUp}');

      expect(screen.getByText('First')).toBeInTheDocument();

      // Menu should be open and last item should be focused
      await user.keyboard('{ArrowUp}');
      const lastItem = screen.getByRole('button', { name: 'Last' });
      expect(lastItem).toHaveFocus();
    });

    it('handles ArrowDown when menu has NO focusable items', async () => {
      const user = userEvent.setup();

      render(
        <Dropdown trigger={<span>Open</span>}>
          <div>Not focusable</div>
        </Dropdown>,
      );

      const trigger = screen.getByRole('button');
      await user.click(trigger);

      // Should not crash when pressing ArrowDown with no focusable items
      expect(() => user.keyboard('{ArrowDown}')).not.toThrow();
    });

    it('handles ArrowDown when menu is empty', async () => {
      const user = userEvent.setup();

      render(<Dropdown trigger={<span>Open</span>}>{null}</Dropdown>);

      const trigger = screen.getByRole('button');
      await user.click(trigger);

      // Should not crash when pressing ArrowDown with empty menu
      await expect(user.keyboard('{ArrowDown}')).resolves.not.toThrow();
    });

    it('can Tab to trigger', async () => {
      const user = userEvent.setup();

      render(
        <div>
          <button>Before</button>
          <Dropdown trigger={<span>Menu</span>}>
            <MenuItem>Item</MenuItem>
          </Dropdown>
          <button>After</button>
        </div>,
      );

      const trigger = screen.getByRole('button', { name: 'Menu' });

      await user.tab();
      await user.tab();

      expect(trigger).toHaveFocus();
    });
  });

  describe('user interactions - mouse/touch', () => {
    it('handles double-click on trigger gracefully', async () => {
      const user = userEvent.setup();

      render(
        <Dropdown trigger={<span>Toggle</span>}>
          <MenuItem>Item 1</MenuItem>
        </Dropdown>,
      );

      const trigger = screen.getByRole('button');

      await user.dblClick(trigger);

      // Double click = 2 toggles = open then close
      expect(screen.queryByText('Item 1')).not.toBeInTheDocument();
    });

    it('trigger can be clicked multiple times', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();

      render(
        <Dropdown trigger={<span>Toggle</span>} onChange={onChange}>
          <MenuItem>Item 1</MenuItem>
        </Dropdown>,
      );

      const trigger = screen.getByRole('button');

      await user.click(trigger);
      expect(onChange).toHaveBeenCalledWith(true);

      await user.click(trigger);
      expect(onChange).toHaveBeenCalledWith(false);

      await user.click(trigger);
      expect(onChange).toHaveBeenCalledTimes(3);
    });
  });

  describe('accessibility', () => {
    it('trigger has aria-haspopup="menu"', () => {
      render(
        <Dropdown trigger={<span>Open</span>}>
          <MenuItem>Item 1</MenuItem>
        </Dropdown>,
      );

      const trigger = screen.getByRole('button');
      expect(trigger).toHaveAttribute('aria-haspopup', 'menu');
    });

    it('trigger has aria-expanded="false" when closed', () => {
      render(
        <Dropdown trigger={<span>Open</span>}>
          <MenuItem>Item 1</MenuItem>
        </Dropdown>,
      );

      const trigger = screen.getByRole('button');
      expect(trigger).toHaveAttribute('aria-expanded', 'false');
    });

    it('trigger has aria-expanded="true" when open', async () => {
      const user = userEvent.setup();

      render(
        <Dropdown trigger={<span>Open</span>}>
          <MenuItem>Item 1</MenuItem>
        </Dropdown>,
      );

      const trigger = screen.getByRole('button');

      await user.click(trigger);

      expect(trigger).toHaveAttribute('aria-expanded', 'true');
    });

    it('menu has role="menu"', async () => {
      const user = userEvent.setup();

      render(
        <Dropdown trigger={<span>Open</span>}>
          <MenuItem>Item 1</MenuItem>
        </Dropdown>,
      );

      await user.click(screen.getByRole('button'));

      const menu = screen.getByRole('menu');
      expect(menu).toBeInTheDocument();
    });

    it('menu items are focusable', async () => {
      const user = userEvent.setup();

      render(
        <Dropdown trigger={<span>Open</span>}>
          <MenuItem>Item 1</MenuItem>
          <MenuItem>Item 2</MenuItem>
        </Dropdown>,
      );

      await user.click(screen.getByRole('button'));

      const items = screen.getAllByRole('button');
      items.forEach((item) => {
        if (item.textContent !== 'Open') {
          expect(item).toHaveAttribute('type', 'button');
        }
      });
    });
  });

  describe('real-world chaos - aggressive bug hunting', () => {
    it('survives rapid Escape key spamming', async () => {
      const user = userEvent.setup();

      render(
        <Dropdown trigger={<span>Open</span>} defaultOpen>
          <MenuItem>Item 1</MenuItem>
        </Dropdown>,
      );

      // Spam Escape 10 times
      for (let i = 0; i < 10; i++) {
        await user.keyboard('{Escape}');
      }

      expect(screen.queryByText('Item 1')).not.toBeInTheDocument();
    });

    it('survives rapid ArrowDown spamming', async () => {
      const user = userEvent.setup();

      render(
        <Dropdown trigger={<span>Open</span>} defaultOpen>
          <MenuItem>Item 1</MenuItem>
          <MenuItem>Item 2</MenuItem>
          <MenuItem>Item 3</MenuItem>
        </Dropdown>,
      );

      // Spam ArrowDown 20 times
      for (let i = 0; i < 20; i++) {
        await user.keyboard('{ArrowDown}');
      }

      // Should not crash
      expect(screen.getByText('Item 1')).toBeInTheDocument();
    });

    it('handles nested menu with complex DOM structure', async () => {
      const user = userEvent.setup();

      render(
        <Dropdown trigger={<span>Open</span>}>
          <div>
            <div>
              <MenuItem>Nested Item 1</MenuItem>
            </div>
            <MenuItem>Nested Item 2</MenuItem>
          </div>
        </Dropdown>,
      );

      await user.click(screen.getByRole('button'));

      expect(screen.getByText('Nested Item 1')).toBeInTheDocument();
      expect(screen.getByText('Nested Item 2')).toBeInTheDocument();

      // ArrowDown should still work with nested structure
      await user.keyboard('{ArrowDown}');
      const firstItem = screen.getByRole('button', { name: 'Nested Item 1' });
      expect(firstItem).toHaveFocus();
    });
  });
});
