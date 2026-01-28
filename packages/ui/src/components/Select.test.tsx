// packages/ui/src/components/Select.test.tsx
/** @vitest-environment jsdom */
import { Select } from '@components/Select';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

describe('Select', () => {
  describe('happy path', () => {
    it('renders with trigger and extracted label', () => {
      render(
        <Select aria-label="Fruit" defaultValue="apple">
          <option value="apple">Apple</option>
          <option value="banana">Banana</option>
        </Select>,
      );

      const trigger = screen.getByRole('button', { name: /fruit/i });
      expect(trigger).toBeInTheDocument();
      expect(trigger).toHaveTextContent('Apple');
    });

    it('opens menu on click and displays options', async () => {
      const user = userEvent.setup();
      render(
        <Select aria-label="Fruit" defaultValue="apple">
          <option value="apple">Apple</option>
          <option value="banana">Banana</option>
        </Select>,
      );

      const trigger = screen.getByRole('button', { name: /fruit/i });
      await user.click(trigger);

      expect(screen.getByRole('listbox')).toBeInTheDocument();
      expect(screen.getAllByRole('option')).toHaveLength(2);
      expect(screen.getByRole('option', { name: 'Apple' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Banana' })).toBeInTheDocument();
    });

    it('changes selection on option click', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(
        <Select aria-label="Fruit" defaultValue="apple" onChange={onChange}>
          <option value="apple">Apple</option>
          <option value="banana">Banana</option>
        </Select>,
      );

      const trigger = screen.getByRole('button', { name: /fruit/i });
      await user.click(trigger);
      await user.click(screen.getByRole('option', { name: 'Banana' }));

      expect(onChange).toHaveBeenCalledWith('banana');
      expect(trigger).toHaveTextContent('Banana');
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });
  });

  describe('keyboard navigation', () => {
    it('opens menu with ArrowDown and highlights current value', async () => {
      const user = userEvent.setup();
      render(
        <Select aria-label="Fruit" defaultValue="banana">
          <option value="apple">Apple</option>
          <option value="banana">Banana</option>
        </Select>,
      );

      const trigger = screen.getByRole('button', { name: /fruit/i });
      trigger.focus();
      await user.keyboard('{ArrowDown}');

      expect(screen.getByRole('listbox')).toBeInTheDocument();
      const bananaOption = screen.getByRole('option', { name: 'Banana' });
      expect(bananaOption).toHaveAttribute('data-highlighted', 'true');
    });

    it('navigates through options with ArrowDown/ArrowUp', async () => {
      const user = userEvent.setup();
      render(
        <Select aria-label="Fruit" defaultValue="apple">
          <option value="apple">Apple</option>
          <option value="banana">Banana</option>
          <option value="cherry">Cherry</option>
        </Select>,
      );

      const trigger = screen.getByRole('button', { name: /fruit/i });
      trigger.focus();
      await user.keyboard('{ArrowDown}'); // Open

      const banana = screen.getByRole('option', { name: 'Banana' });
      const cherry = screen.getByRole('option', { name: 'Cherry' });

      await user.keyboard('{ArrowDown}');
      expect(banana).toHaveAttribute('data-highlighted', 'true');

      await user.keyboard('{ArrowDown}');
      expect(cherry).toHaveAttribute('data-highlighted', 'true');

      await user.keyboard('{ArrowUp}');
      expect(banana).toHaveAttribute('data-highlighted', 'true');
    });

    it('selects highlighted option with Enter', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(
        <Select aria-label="Fruit" defaultValue="apple" onChange={onChange}>
          <option value="apple">Apple</option>
          <option value="banana">Banana</option>
        </Select>,
      );

      const trigger = screen.getByRole('button', { name: /fruit/i });
      trigger.focus();
      await user.keyboard('{ArrowDown}'); // Open
      await user.keyboard('{ArrowDown}'); // Highlight Banana
      await user.keyboard('{Enter}');

      expect(onChange).toHaveBeenCalledWith('banana');
      expect(trigger).toHaveTextContent('Banana');
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });

    it('closes menu with Escape and restores focus', async () => {
      const user = userEvent.setup();
      render(
        <Select aria-label="Fruit" defaultValue="apple">
          <option value="apple">Apple</option>
        </Select>,
      );

      const trigger = screen.getByRole('button', { name: /fruit/i });
      await user.click(trigger);
      expect(screen.getByRole('listbox')).toBeInTheDocument();

      await user.keyboard('{Escape}');
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
      expect(trigger).toHaveFocus();
    });

    it('navigates to Home and End of list', async () => {
      const user = userEvent.setup();
      render(
        <Select aria-label="Fruit" defaultValue="banana">
          <option value="apple">Apple</option>
          <option value="banana">Banana</option>
          <option value="cherry">Cherry</option>
        </Select>,
      );

      const trigger = screen.getByRole('button', { name: /fruit/i });
      await user.click(trigger);

      await user.keyboard('{End}');
      expect(screen.getByRole('option', { name: 'Cherry' })).toHaveAttribute(
        'data-highlighted',
        'true',
      );

      await user.keyboard('{Home}');
      expect(screen.getByRole('option', { name: 'Apple' })).toHaveAttribute(
        'data-highlighted',
        'true',
      );
    });
  });

  describe('edge cases', () => {
    it('handles empty children gracefully', () => {
      render(<Select aria-label="Empty">{null}</Select>);
      const trigger = screen.getByRole('button', { name: /empty/i });
      expect(trigger).toBeInTheDocument();
    });

    it('ignores non-option children', () => {
      render(
        <Select aria-label="Mixed" defaultValue="valid">
          <div>Invalid</div>
          <option value="valid">Valid</option>
          <span>Also Invalid</span>
        </Select>,
      );

      const trigger = screen.getByRole('button', { name: /mixed/i });
      expect(trigger).toHaveTextContent('Valid');
    });

    it('handles options without explicit value prop (uses children as value)', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(
        <Select aria-label="Fruit" onChange={onChange}>
          <option>Apple</option>
          <option>Banana</option>
        </Select>,
      );

      await user.click(screen.getByRole('button', { name: /fruit/i }));
      await user.click(screen.getByRole('option', { name: 'Banana' }));

      expect(onChange).toHaveBeenCalledWith('Banana');
    });

    it('respects disabled prop on trigger', () => {
      render(
        <Select aria-label="Disabled" disabled defaultValue="one">
          <option value="one">One</option>
        </Select>,
      );

      const trigger = screen.getByRole('button', { name: /disabled/i });
      expect(trigger).toBeDisabled();
    });

    it('skips disabled options in keyboard navigation', async () => {
      const user = userEvent.setup();
      render(
        <Select aria-label="Fruit" defaultValue="apple">
          <option value="apple">Apple</option>
          <option value="banana" disabled>
            Banana
          </option>
          <option value="cherry">Cherry</option>
        </Select>,
      );

      const trigger = screen.getByRole('button', { name: /fruit/i });
      await user.click(trigger); // Open, Apple (selected) should be highlighted

      const apple = screen.getByRole('option', { name: 'Apple' });
      expect(apple).toHaveAttribute('data-highlighted', 'true');

      await user.keyboard('{ArrowDown}'); // Should skip Banana, highlight Cherry

      expect(screen.getByRole('option', { name: 'Cherry' })).toHaveAttribute(
        'data-highlighted',
        'true',
      );
    });

    it('handles rapid toggling without breaking state', async () => {
      const user = userEvent.setup();
      render(
        <Select aria-label="Rapid">
          <option value="1">1</option>
        </Select>,
      );

      const trigger = screen.getByRole('button', { name: /rapid/i });
      for (let i = 0; i < 10; i++) {
        await user.click(trigger);
      }

      await waitFor(() => {
        expect(trigger).toBeInTheDocument();
      });
    });
  });

  describe('controlled vs uncontrolled', () => {
    it('works in uncontrolled mode with defaultValue', async () => {
      const user = userEvent.setup();
      render(
        <Select aria-label="Fruit" defaultValue="apple">
          <option value="apple">Apple</option>
          <option value="banana">Banana</option>
        </Select>,
      );

      const trigger = screen.getByRole('button', { name: /fruit/i });
      expect(trigger).toHaveTextContent('Apple');

      await user.click(trigger);
      await user.click(screen.getByRole('option', { name: 'Banana' }));
      expect(trigger).toHaveTextContent('Banana');
    });

    it('works in controlled mode with value and onChange', async () => {
      const user = userEvent.setup();
      const ControlledSelect = (): React.ReactElement => {
        const [val, setVal] = useState('apple');
        return (
          <Select aria-label="Fruit" value={val} onChange={setVal}>
            <option value="apple">Apple</option>
            <option value="banana">Banana</option>
          </Select>
        );
      };

      render(<ControlledSelect />);
      const trigger = screen.getByRole('button', { name: /fruit/i });
      expect(trigger).toHaveTextContent('Apple');

      await user.click(trigger);
      await user.click(screen.getByRole('option', { name: 'Banana' }));
      expect(trigger).toHaveTextContent('Banana');
    });
  });

  describe('accessibility', () => {
    it('has required ARIA attributes on trigger', () => {
      render(
        <Select aria-label="Fruit" defaultValue="apple">
          <option value="apple">Apple</option>
        </Select>,
      );

      const trigger = screen.getByRole('button', { name: /fruit/i });
      expect(trigger).toHaveAttribute('aria-haspopup', 'listbox');
      expect(trigger).toHaveAttribute('aria-expanded', 'false');
    });

    it('updates aria-expanded when open', async () => {
      const user = userEvent.setup();
      render(
        <Select aria-label="Fruit" defaultValue="apple">
          <option value="apple">Apple</option>
        </Select>,
      );

      const trigger = screen.getByRole('button', { name: /fruit/i });
      await user.click(trigger);
      expect(trigger).toHaveAttribute('aria-expanded', 'true');
    });

    it('uses role="listbox" and role="option"', async () => {
      const user = userEvent.setup();
      render(
        <Select aria-label="Fruit" defaultValue="apple">
          <option value="apple">Apple</option>
        </Select>,
      );

      await user.click(screen.getByRole('button', { name: /fruit/i }));
      expect(screen.getByRole('listbox')).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Apple' })).toBeInTheDocument();
    });

    it('marks selected option with aria-selected', async () => {
      const user = userEvent.setup();
      render(
        <Select aria-label="Fruit" defaultValue="apple">
          <option value="apple">Apple</option>
          <option value="banana">Banana</option>
        </Select>,
      );

      await user.click(screen.getByRole('button', { name: /fruit/i }));
      expect(screen.getByRole('option', { name: 'Apple' })).toHaveAttribute(
        'aria-selected',
        'true',
      );
      expect(screen.getByRole('option', { name: 'Banana' })).toHaveAttribute(
        'aria-selected',
        'false',
      );
    });
  });

  describe('additional behaviors', () => {
    it('selects with Space key', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(
        <Select aria-label="Fruit" defaultValue="apple" onChange={onChange}>
          <option value="apple">Apple</option>
          <option value="banana">Banana</option>
        </Select>,
      );

      const trigger = screen.getByRole('button', { name: /fruit/i });
      trigger.focus();
      await user.keyboard(' '); // Open with Space
      await user.keyboard('{ArrowDown}'); // Highlight Banana
      await user.keyboard(' '); // Select with Space

      expect(onChange).toHaveBeenCalledWith('banana');
    });

    it('closes menu on Tab without selecting', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(
        <Select aria-label="Fruit" defaultValue="apple" onChange={onChange}>
          <option value="apple">Apple</option>
          <option value="banana">Banana</option>
        </Select>,
      );

      await user.click(screen.getByRole('button', { name: /fruit/i }));
      expect(screen.getByRole('listbox')).toBeInTheDocument();

      await user.keyboard('{Tab}');
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
      expect(onChange).not.toHaveBeenCalled();
    });

    it('highlights option on mouse enter', async () => {
      const user = userEvent.setup();
      render(
        <Select aria-label="Fruit" defaultValue="apple">
          <option value="apple">Apple</option>
          <option value="banana">Banana</option>
        </Select>,
      );

      await user.click(screen.getByRole('button', { name: /fruit/i }));

      const banana = screen.getByRole('option', { name: 'Banana' });
      await user.hover(banana);

      expect(banana).toHaveAttribute('data-highlighted', 'true');
    });

    it('forwards ref to container', () => {
      const ref = { current: null };
      render(
        <Select ref={ref} aria-label="Fruit">
          <option value="apple">Apple</option>
        </Select>,
      );

      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });

    it('merges className with base class', () => {
      const { container } = render(
        <Select aria-label="Fruit" className="custom-select">
          <option value="apple">Apple</option>
        </Select>,
      );

      expect(container.firstChild).toHaveClass('select-custom');
      expect(container.firstChild).toHaveClass('custom-select');
    });

    it('does not highlight disabled options on mouse enter', async () => {
      const user = userEvent.setup();
      render(
        <Select aria-label="Fruit" defaultValue="apple">
          <option value="apple">Apple</option>
          <option value="banana" disabled>
            Banana
          </option>
        </Select>,
      );

      await user.click(screen.getByRole('button', { name: /fruit/i }));

      const banana = screen.getByRole('option', { name: 'Banana' });
      await user.hover(banana);

      expect(banana).not.toHaveAttribute('data-highlighted', 'true');
    });
  });
});
