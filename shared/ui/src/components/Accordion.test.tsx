// shared/ui/src/components/Accordion.test.tsx
// shared/ui/src/elements/__tests__/Accordion.test.tsx
/** @vitest-environment jsdom */
import { Accordion } from '@components/Accordion';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

const items = [
  { id: 'one', title: 'Section One', content: 'Content One' },
  { id: 'two', title: 'Section Two', content: 'Content Two' },
  { id: 'three', title: 'Section Three', content: 'Content Three' },
];

describe('Accordion', () => {
  describe('happy path', () => {
    it('renders all accordion items', () => {
      render(<Accordion items={items} />);

      expect(screen.getByRole('button', { name: /section one/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /section two/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /section three/i })).toBeInTheDocument();
    });

    it('starts with all items collapsed by default', () => {
      render(<Accordion items={items} />);

      expect(screen.queryByText('Content One')).not.toBeInTheDocument();
      expect(screen.queryByText('Content Two')).not.toBeInTheDocument();
      expect(screen.queryByText('Content Three')).not.toBeInTheDocument();

      const buttons = screen.getAllByRole('button');
      buttons.forEach((button) => {
        expect(button).toHaveAttribute('aria-expanded', 'false');
      });
    });

    it('toggles open/closed on click with userEvent', async () => {
      const user = userEvent.setup();
      render(<Accordion items={items} />);

      const headerOne = screen.getByRole('button', { name: /section one/i });
      expect(screen.queryByText('Content One')).not.toBeInTheDocument();
      expect(headerOne).toHaveAttribute('aria-expanded', 'false');

      await user.click(headerOne);
      expect(screen.getByText('Content One')).toBeInTheDocument();
      expect(headerOne).toHaveAttribute('aria-expanded', 'true');

      await user.click(headerOne);
      expect(screen.queryByText('Content One')).not.toBeInTheDocument();
      expect(headerOne).toHaveAttribute('aria-expanded', 'false');
    });

    it('switches panels when clicking different headers', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(<Accordion items={items} onChange={onChange} />);

      await user.click(screen.getByRole('button', { name: /section one/i }));
      expect(onChange).toHaveBeenCalledWith('one');
      expect(screen.getByText('Content One')).toBeInTheDocument();
      expect(screen.queryByText('Content Two')).not.toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: /section two/i }));
      expect(onChange).toHaveBeenCalledWith('two');
      expect(screen.queryByText('Content One')).not.toBeInTheDocument();
      expect(screen.getByText('Content Two')).toBeInTheDocument();
    });

    it('works in controlled mode', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();

      const { rerender } = render(<Accordion items={items} value="one" onChange={onChange} />);

      expect(screen.getByText('Content One')).toBeInTheDocument();
      expect(screen.queryByText('Content Two')).not.toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: /section two/i }));
      expect(onChange).toHaveBeenCalledWith('two');

      // Simulate parent updating the prop
      rerender(<Accordion items={items} value="two" onChange={onChange} />);
      expect(screen.queryByText('Content One')).not.toBeInTheDocument();
      expect(screen.getByText('Content Two')).toBeInTheDocument();
    });

    it('opens item with defaultValue', () => {
      render(<Accordion items={items} defaultValue="two" />);

      expect(screen.queryByText('Content One')).not.toBeInTheDocument();
      expect(screen.getByText('Content Two')).toBeInTheDocument();
      expect(screen.queryByText('Content Three')).not.toBeInTheDocument();
    });
  });

  describe('edge cases - missing/invalid props', () => {
    it('renders without crashing when items is empty array', () => {
      expect(() => {
        render(<Accordion items={[]} />);
      }).not.toThrow();

      const accordion = document.querySelector('.accordion');
      expect(accordion).toBeInTheDocument();
      expect(accordion).toBeEmptyDOMElement();
    });

    it('handles items with no id gracefully', () => {
      const invalidItems = [{ title: 'No ID', content: 'Content' }];

      expect(() => {
        // @ts-expect-error Testing invalid data
        render(<Accordion items={invalidItems} />);
      }).not.toThrow();
    });

    it('handles items with null title', () => {
      const itemsWithNull = [{ id: 'one', title: null, content: 'Content' }];

      render(<Accordion items={itemsWithNull} />);
      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(1);
    });

    it('handles items with null content', async () => {
      const itemsWithNullContent = [{ id: 'one', title: 'Title', content: null }];
      const user = userEvent.setup();

      render(<Accordion items={itemsWithNullContent} />);
      await user.click(screen.getByRole('button', { name: /title/i }));

      const region = screen.getByRole('region');
      expect(region).toBeInTheDocument();
    });

    it('renders without onChange handler', async () => {
      const user = userEvent.setup();

      expect(() => {
        render(<Accordion items={items} />);
      }).not.toThrow();

      const headerOne = screen.getByRole('button', { name: /section one/i });
      await user.click(headerOne);

      expect(screen.getByText('Content One')).toBeInTheDocument();
    });

    it('handles null onChange gracefully', async () => {
      const user = userEvent.setup();

      // @ts-expect-error Testing invalid prop
      render(<Accordion items={items} onChange={null} />);

      const headerOne = screen.getByRole('button', { name: /section one/i });
      await user.click(headerOne);

      expect(screen.getByText('Content One')).toBeInTheDocument();
    });

    it('handles undefined defaultValue', () => {
      render(<Accordion items={items} />);

      expect(screen.queryByText('Content One')).not.toBeInTheDocument();
      expect(screen.queryByText('Content Two')).not.toBeInTheDocument();
    });

    it('handles invalid defaultValue id', () => {
      render(<Accordion items={items} defaultValue="nonexistent" />);

      // Nothing should be open
      expect(screen.queryByText('Content One')).not.toBeInTheDocument();
      expect(screen.queryByText('Content Two')).not.toBeInTheDocument();
    });
  });

  describe('edge cases - boundary conditions', () => {
    it('handles rapid clicking without breaking', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();

      render(<Accordion items={items} onChange={onChange} />);
      const headerOne = screen.getByRole('button', { name: /section one/i });

      // Rapid clicks (10 times)
      for (let i = 0; i < 10; i++) {
        await user.click(headerOne);
      }

      expect(onChange).toHaveBeenCalledTimes(10);
      // Final state should be closed (even number of clicks)
      expect(screen.queryByText('Content One')).not.toBeInTheDocument();
    });

    it('handles switching between all items rapidly', async () => {
      const user = userEvent.setup();

      render(<Accordion items={items} />);

      // Rapidly switch between items
      await user.click(screen.getByRole('button', { name: /section one/i }));
      await user.click(screen.getByRole('button', { name: /section two/i }));
      await user.click(screen.getByRole('button', { name: /section three/i }));
      await user.click(screen.getByRole('button', { name: /section one/i }));

      expect(screen.getByText('Content One')).toBeInTheDocument();
      expect(screen.queryByText('Content Two')).not.toBeInTheDocument();
      expect(screen.queryByText('Content Three')).not.toBeInTheDocument();
    });

    it('handles very large number of items', () => {
      const manyItems = Array.from({ length: 50 }, (_, i) => ({
        id: `item-${String(i)}`,
        title: `Title ${String(i)}`,
        content: `Content ${String(i)}`,
      }));

      const { container } = render(<Accordion items={manyItems} />);

      const buttons = container.querySelectorAll('.accordion-header');
      expect(buttons).toHaveLength(50);
    });

    it('handles items with duplicate IDs', async () => {
      const duplicateItems = [
        { id: 'duplicate', title: 'First', content: 'Content 1' },
        { id: 'duplicate', title: 'Second', content: 'Content 2' },
      ];
      const user = userEvent.setup();

      render(<Accordion items={duplicateItems} />);

      await user.click(screen.getByRole('button', { name: /first/i }));

      // Both should open since they have the same ID
      expect(screen.getByText('Content 1')).toBeInTheDocument();
      expect(screen.getByText('Content 2')).toBeInTheDocument();
    });
  });

  describe('edge cases - special characters', () => {
    it('handles special characters in title and content', async () => {
      const specialItems = [
        {
          id: 'special',
          title: '<script>alert("xss")</script>',
          content: '<div>HTML & Special chars: <>&"\'</div>',
        },
      ];
      const user = userEvent.setup();

      render(<Accordion items={specialItems} />);

      const button = screen.getByRole('button', { name: /<script>alert\("xss"\)<\/script>/i });
      await user.click(button);

      expect(screen.getByText(/HTML & Special chars/i)).toBeInTheDocument();
    });

    it('handles empty string IDs', () => {
      const emptyIdItems = [{ id: '', title: 'Empty ID', content: 'Content' }];

      render(<Accordion items={emptyIdItems} />);
      expect(screen.getByRole('button', { name: /empty id/i })).toBeInTheDocument();
    });
  });

  describe('edge cases - cleanup', () => {
    it('cleans up properly on unmount', () => {
      const { unmount } = render(<Accordion items={items} />);

      const accordion = document.querySelector('.accordion');
      expect(accordion).toBeInTheDocument();

      unmount();

      expect(document.querySelector('.accordion')).not.toBeInTheDocument();
    });
  });

  describe('user interactions - keyboard', () => {
    it('can be focused with Tab key', async () => {
      const user = userEvent.setup();

      render(
        <div>
          <button>Before</button>
          <Accordion items={items} />
          <button>After</button>
        </div>,
      );

      const firstHeader = screen.getByRole('button', { name: /section one/i });

      // Tab to first accordion header
      await user.tab();
      await user.tab();

      expect(firstHeader).toHaveFocus();
    });

    it('toggles with Space key', async () => {
      const user = userEvent.setup();

      render(<Accordion items={items} />);
      const headerOne = screen.getByRole('button', { name: /section one/i });

      headerOne.focus();
      await user.keyboard(' ');

      expect(screen.getByText('Content One')).toBeInTheDocument();
    });

    it('toggles with Enter key', async () => {
      const user = userEvent.setup();

      render(<Accordion items={items} />);
      const headerOne = screen.getByRole('button', { name: /section one/i });

      headerOne.focus();
      await user.keyboard('{Enter}');

      expect(screen.getByText('Content One')).toBeInTheDocument();
    });

    it('maintains focus after toggle', async () => {
      const user = userEvent.setup();

      render(<Accordion items={items} />);
      const headerOne = screen.getByRole('button', { name: /section one/i });

      headerOne.focus();
      expect(headerOne).toHaveFocus();

      await user.click(headerOne);

      expect(headerOne).toHaveFocus();
    });

    it('allows Tab navigation between headers', async () => {
      const user = userEvent.setup();

      render(<Accordion items={items} />);

      const headerOne = screen.getByRole('button', { name: /section one/i });
      const headerTwo = screen.getByRole('button', { name: /section two/i });

      headerOne.focus();
      expect(headerOne).toHaveFocus();

      await user.tab();
      expect(headerTwo).toHaveFocus();
    });
  });

  describe('user interactions - mouse/touch', () => {
    it('handles double-click gracefully', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();

      render(<Accordion items={items} onChange={onChange} />);
      const headerOne = screen.getByRole('button', { name: /section one/i });

      await user.dblClick(headerOne);

      // Double click = 2 clicks = open then close
      expect(onChange).toHaveBeenCalledTimes(2);
      expect(screen.queryByText('Content One')).not.toBeInTheDocument();
    });

    it('handles focus and blur events', async () => {
      const user = userEvent.setup();

      render(<Accordion items={items} />);
      const headerOne = screen.getByRole('button', { name: /section one/i });

      await user.click(headerOne);
      expect(headerOne).toHaveFocus();

      await user.tab(); // Tab away to blur
      expect(headerOne).not.toHaveFocus();
    });
  });

  describe('accessibility', () => {
    it('uses correct ARIA attributes', () => {
      render(<Accordion items={items} />);

      const headerOne = screen.getByRole('button', { name: /section one/i });
      expect(headerOne).toHaveAttribute('aria-expanded', 'false');
      expect(headerOne).toHaveAttribute('aria-controls');
      expect(headerOne).toHaveAttribute('type', 'button');
    });

    it('updates aria-expanded on toggle', async () => {
      const user = userEvent.setup();

      render(<Accordion items={items} />);
      const headerOne = screen.getByRole('button', { name: /section one/i });

      expect(headerOne).toHaveAttribute('aria-expanded', 'false');

      await user.click(headerOne);

      expect(headerOne).toHaveAttribute('aria-expanded', 'true');
    });

    it('content has proper role and aria-labelledby', async () => {
      const user = userEvent.setup();

      render(<Accordion items={items} />);
      const headerOne = screen.getByRole('button', { name: /section one/i });

      await user.click(headerOne);

      const content = screen.getByRole('region');
      expect(content).toBeInTheDocument();
      expect(content).toHaveAttribute('aria-labelledby', headerOne.id);
    });

    it('uses semantic HTML structure', () => {
      render(<Accordion items={items} />);

      const headings = document.querySelectorAll('h3');
      expect(headings).toHaveLength(3);

      headings.forEach((heading) => {
        expect(heading).toHaveClass('accordion-heading');
        const button = within(heading).getByRole('button');
        expect(button).toBeInTheDocument();
      });
    });

    it('has accessible expand/collapse indicators', () => {
      render(<Accordion items={items} />);

      const headerOne = screen.getByRole('button', { name: /section one/i });
      const indicator = headerOne.querySelector('[aria-hidden="true"]');

      expect(indicator).toBeInTheDocument();
      expect(indicator).toHaveTextContent('+'); // Collapsed state
    });
  });
});
