// packages/ui/src/elements/__tests__/Radio.test.tsx
/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState, type ReactElement } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { Radio } from '../Radio';

function RadioHarness(): ReactElement {
  const [value, setValue] = useState<'a' | 'b'>('a');
  return (
    <div>
      <Radio
        name="group"
        label="Option A"
        checked={value === 'a'}
        onChange={() => {
          setValue('a');
        }}
      />
      <Radio
        name="group"
        label="Option B"
        checked={value === 'b'}
        onChange={() => {
          setValue('b');
        }}
      />
    </div>
  );
}

describe('Radio', () => {
  describe('happy path', () => {
    it('renders radio with label', () => {
      render(<Radio name="test" label="Test Option" />);

      expect(screen.getByLabelText('Test Option')).toBeInTheDocument();
      expect(screen.getByRole('radio')).toBeInTheDocument();
    });

    it('renders checked radio', () => {
      render(<Radio name="test" label="Checked" checked />);

      const radio = screen.getByLabelText('Checked');
      expect(radio).toBeChecked();
    });

    it('renders unchecked radio', () => {
      render(<Radio name="test" label="Unchecked" checked={false} />);

      const radio = screen.getByLabelText('Unchecked');
      expect(radio).not.toBeChecked();
    });

    it('calls onChange when clicked with userEvent', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();

      render(<Radio name="test" label="Click me" onChange={onChange} />);

      const radio = screen.getByLabelText('Click me');
      await user.click(radio);

      expect(onChange).toHaveBeenCalledWith(true);
      expect(onChange).toHaveBeenCalledTimes(1);
    });

    it('respects defaultChecked when uncontrolled', () => {
      render(<Radio name="test" label="Default Checked" defaultChecked />);

      const radio = screen.getByLabelText('Default Checked');
      expect(radio).toBeChecked();
    });

    it('shows visual indicator when checked', () => {
      const { container } = render(<Radio name="test" label="Visual" checked />);

      const dot = container.querySelector('.ui-radio-dot');
      expect(dot).toBeInTheDocument();
    });

    it('hides visual indicator when unchecked', () => {
      const { container } = render(<Radio name="test" label="Visual" checked={false} />);

      const dot = container.querySelector('.ui-radio-dot');
      expect(dot).not.toBeInTheDocument();
    });
  });

  describe('edge cases - missing/invalid props', () => {
    it('renders without label', () => {
      render(<Radio name="test" />);

      const radio = screen.getByRole('radio');
      expect(radio).toBeInTheDocument();
    });

    it('handles null label gracefully', () => {
      render(<Radio name="test" label={null} />);

      const radio = screen.getByRole('radio');
      expect(radio).toBeInTheDocument();
    });

    it('handles undefined label gracefully', () => {
      render(<Radio name="test" label={undefined} />);

      const radio = screen.getByRole('radio');
      expect(radio).toBeInTheDocument();
    });

    it('handles empty string label', () => {
      render(<Radio name="test" label="" />);

      const radio = screen.getByRole('radio');
      expect(radio).toBeInTheDocument();
    });

    it('handles null onChange gracefully', async () => {
      const user = userEvent.setup();

      render(
        // @ts-expect-error Testing invalid prop
        <Radio name="test" label="Test" onChange={null} />,
      );

      const radio = screen.getByLabelText('Test');
      await expect(user.click(radio)).resolves.not.toThrow();
    });

    it('handles undefined onChange gracefully', async () => {
      const user = userEvent.setup();

      render(<Radio name="test" label="Test" onChange={undefined} />);

      const radio = screen.getByLabelText('Test');
      await user.click(radio);

      // Should not crash
      expect(radio).toBeInTheDocument();
    });
  });

  describe('edge cases - boundary conditions', () => {
    it('handles rapid clicks', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();

      render(<Radio name="test" label="Rapid" onChange={onChange} />);

      const radio = screen.getByLabelText('Rapid');

      // Click 10 times rapidly
      for (let i = 0; i < 10; i++) {
        await user.click(radio);
      }

      // Should only call onChange once (standard radio behavior: subsequent clicks on checked radio do nothing)
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledWith(true);
    });

    it('handles clicking already checked radio', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();

      render(<Radio name="test" label="Checked" checked onChange={onChange} />);

      const radio = screen.getByLabelText('Checked');
      await user.click(radio);

      // Should NOT call onChange because state didn't change
      expect(onChange).not.toHaveBeenCalled();
    });

    it('handles alternating onChange callbacks', async () => {
      const user = userEvent.setup();
      const onChange1 = vi.fn();
      const onChange2 = vi.fn();

      const { rerender } = render(<Radio name="test" label="Test" onChange={onChange1} />);

      const radio = screen.getByLabelText('Test');
      await user.click(radio);

      expect(onChange1).toHaveBeenCalledWith(true);
      expect(onChange2).not.toHaveBeenCalled();

      // Change callback
      rerender(<Radio name="test" label="Test" onChange={onChange2} />);

      // Clicking again (already checked) should do nothing
      await user.click(radio);

      expect(onChange1).toHaveBeenCalledTimes(1);
      expect(onChange2).not.toHaveBeenCalled();
    });
  });

  describe('keyboard interactions', () => {
    it('selects on Space key', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();

      render(<Radio name="test" label="Keyboard" onChange={onChange} />);

      const radio = screen.getByLabelText('Keyboard');
      radio.focus();
      await user.keyboard(' ');

      expect(onChange).toHaveBeenCalledWith(true);
    });

    it('is keyboard focusable', async () => {
      const user = userEvent.setup();

      render(<Radio name="test" label="Focus" />);

      await user.tab();

      expect(screen.getByLabelText('Focus')).toHaveFocus();
    });
  });

  describe('mouse interactions', () => {
    it('handles double-click', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();

      render(<Radio name="test" label="Double" onChange={onChange} />);

      const radio = screen.getByLabelText('Double');
      await user.dblClick(radio);

      // Double-click should trigger onChange once (first click checks, second does nothing)
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledWith(true);
    });

    it('handles clicking label', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();

      render(<Radio name="test" label="Label Click" onChange={onChange} />);

      // Click the label text (not the input)
      const label = screen.getByText('Label Click');
      await user.click(label);

      expect(onChange).toHaveBeenCalledWith(true);
    });
  });

  describe('controlled vs uncontrolled', () => {
    it('works in uncontrolled mode with defaultChecked', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();

      render(<Radio name="test" label="Uncontrolled" defaultChecked onChange={onChange} />);

      const radio = screen.getByLabelText('Uncontrolled');
      expect(radio).toBeChecked();

      await user.click(radio);
      // Already checked, no change
      expect(onChange).not.toHaveBeenCalled();
    });

    it('works in controlled mode with checked prop', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();

      const { rerender } = render(
        <Radio name="test" label="Controlled" checked={false} onChange={onChange} />,
      );

      const radio = screen.getByLabelText('Controlled');
      expect(radio).not.toBeChecked();

      await user.click(radio);
      expect(onChange).toHaveBeenCalledWith(true);

      // Parent updates checked prop
      rerender(<Radio name="test" label="Controlled" checked={true} onChange={onChange} />);

      expect(radio).toBeChecked();
    });

    it('respects controlled checked prop changes', () => {
      const { rerender } = render(<Radio name="test" label="Test" checked={false} />);

      const radio = screen.getByLabelText('Test');
      expect(radio).not.toBeChecked();

      rerender(<Radio name="test" label="Test" checked={true} />);
      expect(radio).toBeChecked();

      rerender(<Radio name="test" label="Test" checked={false} />);
      expect(radio).not.toBeChecked();
    });

    it('switches selection when controlled by state', async () => {
      const user = userEvent.setup();

      render(<RadioHarness />);

      const optionA = screen.getByLabelText(/option a/i);
      const optionB = screen.getByLabelText(/option b/i);

      expect(optionA).toBeChecked();
      expect(optionB).not.toBeChecked();

      await user.click(optionB);
      expect(optionB).toBeChecked();
      expect(optionA).not.toBeChecked();

      await user.click(optionA);
      expect(optionA).toBeChecked();
      expect(optionB).not.toBeChecked();
    });
  });

  describe('prop forwarding', () => {
    it('forwards className to label', () => {
      render(<Radio name="test" label="Styled" className="custom-radio" />);

      const label = screen.getByText('Styled').closest('label');
      expect(label).toHaveClass('ui-radio');
      expect(label).toHaveClass('custom-radio');
    });

    it('handles empty className', () => {
      render(<Radio name="test" label="Test" className="" />);

      const label = screen.getByText('Test').closest('label');
      expect(label).toHaveClass('ui-radio');
      expect(label?.className).toBe('ui-radio');
    });

    it('forwards ref to input element', () => {
      const ref = { current: null };
      render(<Radio ref={ref} name="test" label="Ref Test" />);

      expect(ref.current).toBeInstanceOf(HTMLInputElement);
      expect(ref.current).toHaveAttribute('type', 'radio');
    });

    it('forwards disabled prop', () => {
      render(<Radio name="test" label="Disabled" disabled />);

      const radio = screen.getByLabelText('Disabled');
      expect(radio).toBeDisabled();
    });

    it('forwards data attributes', () => {
      render(<Radio name="test" label="Data" data-testid="radio" data-custom="value" />);

      const radio = screen.getByLabelText('Data');
      expect(radio).toHaveAttribute('data-testid', 'radio');
      expect(radio).toHaveAttribute('data-custom', 'value');
    });
  });

  describe('accessibility', () => {
    it('has radio role', () => {
      render(<Radio name="test" label="Test" />);

      expect(screen.getByRole('radio')).toBeInTheDocument();
    });

    it('associates label with input', () => {
      render(<Radio name="test" label="Associated Label" />);

      const radio = screen.getByLabelText('Associated Label');
      expect(radio).toBeInTheDocument();
    });

    it('has correct name attribute', () => {
      render(<Radio name="my-radio-group" label="Test" />);

      const radio = screen.getByLabelText('Test');
      expect(radio).toHaveAttribute('name', 'my-radio-group');
    });
  });

  describe('real-world chaos', () => {
    it('handles rapid mount and unmount', async () => {
      const user = userEvent.setup();

      for (let i = 0; i < 10; i++) {
        const { unmount } = render(<Radio name="test" label={`Radio ${i}`} />);

        const radio = screen.getByLabelText(`Radio ${i}`);
        await user.click(radio);

        unmount();
      }
    });

    it('handles label changes while mounted', () => {
      const { rerender } = render(<Radio name="test" label="Label 1" checked />);

      expect(screen.getByLabelText('Label 1')).toBeChecked();

      rerender(<Radio name="test" label="Label 2" checked />);

      expect(screen.queryByLabelText('Label 1')).not.toBeInTheDocument();
      expect(screen.getByLabelText('Label 2')).toBeChecked();
    });

    it('handles className changes while mounted', () => {
      const { rerender } = render(<Radio name="test" label="Test" className="class1" />);

      const label = screen.getByText('Test').closest('label');
      expect(label).toHaveClass('class1');

      rerender(<Radio name="test" label="Test" className="class2" />);
      expect(label).not.toHaveClass('class1');
      expect(label).toHaveClass('class2');
    });
  });

  describe('visual states', () => {
    it('applies data-checked attribute to circle when checked', () => {
      const { container } = render(<Radio name="test" label="Test" checked />);

      const circle = container.querySelector('.ui-radio-circle');
      expect(circle).toHaveAttribute('data-checked', 'true');
    });

    it('applies data-checked=false to circle when unchecked', () => {
      const { container } = render(<Radio name="test" label="Test" checked={false} />);

      const circle = container.querySelector('.ui-radio-circle');
      expect(circle).toHaveAttribute('data-checked', 'false');
    });

    it('shows dot when checked', () => {
      const { container } = render(<Radio name="test" label="Test" checked />);

      const dot = container.querySelector('.ui-radio-dot');
      expect(dot).toBeInTheDocument();
    });

    it('hides dot when unchecked', () => {
      const { container } = render(<Radio name="test" label="Test" checked={false} />);

      const dot = container.querySelector('.ui-radio-dot');
      expect(dot).not.toBeInTheDocument();
    });
  });
});
