// main/client/ui/src/components/RadioGroup.test.tsx
/** @vitest-environment jsdom */
import { Radio } from '@components/Radio';
import { RadioGroup } from '@components/RadioGroup';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState, type ReactElement } from 'react';
import { describe, expect, it, vi } from 'vitest';

const RadioGroupHarness = (): ReactElement => {
  const [value, setValue] = useState<'a' | 'b' | 'c'>('a');
  return (
    <RadioGroup name="group" aria-label="Options">
      <Radio
        name="group"
        label="First"
        checked={value === 'a'}
        onChange={() => {
          setValue('a');
        }}
      />
      <Radio
        name="group"
        label="Second"
        checked={value === 'b'}
        onChange={() => {
          setValue('b');
        }}
      />
      <Radio
        name="group"
        label="Third"
        checked={value === 'c'}
        onChange={() => {
          setValue('c');
        }}
      />
    </RadioGroup>
  );
};

describe('RadioGroup', () => {
  describe('happy path', () => {
    it('renders radiogroup with children', () => {
      render(
        <RadioGroup name="test" aria-label="Test Group">
          <Radio name="test" label="Option 1" />
          <Radio name="test" label="Option 2" />
        </RadioGroup>,
      );

      expect(screen.getByRole('radiogroup')).toBeInTheDocument();
      expect(screen.getByLabelText('Option 1')).toBeInTheDocument();
      expect(screen.getByLabelText('Option 2')).toBeInTheDocument();
    });

    it('has correct aria-label', () => {
      render(
        <RadioGroup name="test" aria-label="My Group">
          <Radio name="test" label="Option" />
        </RadioGroup>,
      );

      const group = screen.getByRole('radiogroup', { name: 'My Group' });
      expect(group).toBeInTheDocument();
    });

    it('supports aria-labelledby', () => {
      render(
        <div>
          <h2 id="group-label">Choose Option</h2>
          <RadioGroup name="test" aria-labelledby="group-label">
            <Radio name="test" label="Option" />
          </RadioGroup>
        </div>,
      );

      const group = screen.getByRole('radiogroup');
      expect(group).toHaveAttribute('aria-labelledby', 'group-label');
    });
  });

  describe('keyboard navigation - arrow keys', () => {
    it('moves to next radio with ArrowRight', async () => {
      const user = userEvent.setup();

      render(<RadioGroupHarness />);

      const first = screen.getByLabelText('First');
      const second = screen.getByLabelText('Second');

      first.focus();
      await user.keyboard('{ArrowRight}');

      expect(second).toBeChecked();
      expect(second).toHaveFocus();
    });

    it('moves to next radio with ArrowDown', async () => {
      const user = userEvent.setup();

      render(<RadioGroupHarness />);

      const first = screen.getByLabelText('First');
      const second = screen.getByLabelText('Second');

      first.focus();
      await user.keyboard('{ArrowDown}');

      expect(second).toBeChecked();
      expect(second).toHaveFocus();
    });

    it('moves to previous radio with ArrowLeft', async () => {
      const user = userEvent.setup();

      render(<RadioGroupHarness />);

      const first = screen.getByLabelText('First');
      const second = screen.getByLabelText('Second');

      second.focus();
      await user.keyboard('{ArrowLeft}');

      expect(first).toBeChecked();
      expect(first).toHaveFocus();
    });

    it('moves to previous radio with ArrowUp', async () => {
      const user = userEvent.setup();

      render(<RadioGroupHarness />);

      const first = screen.getByLabelText('First');
      const second = screen.getByLabelText('Second');

      second.focus();
      await user.keyboard('{ArrowUp}');

      expect(first).toBeChecked();
      expect(first).toHaveFocus();
    });

    it('wraps to first radio when pressing ArrowRight on last', async () => {
      const user = userEvent.setup();

      render(<RadioGroupHarness />);

      const first = screen.getByLabelText('First');
      const third = screen.getByLabelText('Third');

      third.focus();
      await user.keyboard('{ArrowRight}');

      expect(first).toBeChecked();
      expect(first).toHaveFocus();
    });

    it('wraps to last radio when pressing ArrowLeft on first', async () => {
      const user = userEvent.setup();

      render(<RadioGroupHarness />);

      const first = screen.getByLabelText('First');
      const third = screen.getByLabelText('Third');

      first.focus();
      await user.keyboard('{ArrowLeft}');

      expect(third).toBeChecked();
      expect(third).toHaveFocus();
    });
  });

  describe('keyboard navigation - Home/End', () => {
    it('moves to first radio with Home key', async () => {
      const user = userEvent.setup();

      render(<RadioGroupHarness />);

      const first = screen.getByLabelText('First');
      const third = screen.getByLabelText('Third');

      third.focus();
      await user.keyboard('{Home}');

      expect(first).toBeChecked();
      expect(first).toHaveFocus();
    });

    it('moves to last radio with End key', async () => {
      const user = userEvent.setup();

      render(<RadioGroupHarness />);

      const first = screen.getByLabelText('First');
      const third = screen.getByLabelText('Third');

      first.focus();
      await user.keyboard('{End}');

      expect(third).toBeChecked();
      expect(third).toHaveFocus();
    });
  });

  describe('keyboard navigation - other keys', () => {
    it('does not navigate with other keys', async () => {
      const user = userEvent.setup();

      render(<RadioGroupHarness />);

      const first = screen.getByLabelText('First');

      first.focus();

      // Try various keys that shouldn't navigate
      await user.keyboard('{Tab}');
      await user.keyboard('a');
      await user.keyboard('{Enter}');
      await user.keyboard('{Escape}');

      // First should still be checked and focused
      expect(first).toBeChecked();
    });
  });

  describe('edge cases - group structure', () => {
    it('handles single radio', async () => {
      const user = userEvent.setup();

      render(
        <RadioGroup name="test" aria-label="Single">
          <Radio name="test" label="Only One" />
        </RadioGroup>,
      );

      const radio = screen.getByLabelText('Only One');
      radio.focus();

      // Arrow keys should wrap to same radio
      await user.keyboard('{ArrowRight}');
      expect(radio).toHaveFocus();

      await user.keyboard('{ArrowLeft}');
      expect(radio).toHaveFocus();
    });

    it('handles many radios', async () => {
      const user = userEvent.setup();

      render(
        <RadioGroup name="test" aria-label="Many">
          <Radio name="test" label="Radio 1" defaultChecked />
          <Radio name="test" label="Radio 2" />
          <Radio name="test" label="Radio 3" />
          <Radio name="test" label="Radio 4" />
          <Radio name="test" label="Radio 5" />
        </RadioGroup>,
      );

      const first = screen.getByLabelText('Radio 1');
      const fifth = screen.getByLabelText('Radio 5');

      first.focus();

      // Navigate to end
      await user.keyboard('{End}');
      expect(fifth).toHaveFocus();

      // Navigate to beginning
      await user.keyboard('{Home}');
      expect(first).toHaveFocus();
    });
  });

  describe('edge cases - missing/invalid props', () => {
    it('renders without aria-label or aria-labelledby', () => {
      render(
        <RadioGroup name="test">
          <Radio name="test" label="Option" />
        </RadioGroup>,
      );

      const group = screen.getByRole('radiogroup');
      expect(group).toBeInTheDocument();
    });

    it('handles empty children', () => {
      render(
        <RadioGroup name="test" aria-label="Empty">
          <></>
        </RadioGroup>,
      );

      const group = screen.getByRole('radiogroup');
      expect(group).toBeInTheDocument();
    });

    it('forwards className to group', () => {
      render(
        <RadioGroup name="test" aria-label="Styled" className="custom-group">
          <Radio name="test" label="Option" />
        </RadioGroup>,
      );

      const group = screen.getByRole('radiogroup');
      expect(group).toHaveClass('radio-group');
      expect(group).toHaveClass('custom-group');
    });

    it('handles empty className', () => {
      render(
        <RadioGroup name="test" aria-label="Test" className="">
          <Radio name="test" label="Option" />
        </RadioGroup>,
      );

      const group = screen.getByRole('radiogroup');
      expect(group).toHaveClass('radio-group');
      expect(group.className).toBe('radio-group');
    });
  });

  describe('edge cases - boundary conditions', () => {
    it('handles rapid arrow key presses', async () => {
      const user = userEvent.setup();

      render(<RadioGroupHarness />);

      const first = screen.getByLabelText('First');
      const second = screen.getByLabelText('Second');

      first.focus();

      // Rapidly press ArrowRight
      for (let i = 0; i < 10; i++) {
        await user.keyboard('{ArrowRight}');
      }

      // Should wrap around: 10 % 3 = 1, so should be on second (index 1)
      expect(second).toBeChecked();
      expect(second).toHaveFocus();
    });

    it('handles alternating arrow keys', async () => {
      const user = userEvent.setup();

      render(<RadioGroupHarness />);

      const first = screen.getByLabelText('First');

      first.focus();

      // Alternate between ArrowRight and ArrowLeft
      await user.keyboard('{ArrowRight}'); // to second
      await user.keyboard('{ArrowLeft}'); // back to first
      await user.keyboard('{ArrowRight}'); // to second
      await user.keyboard('{ArrowLeft}'); // back to first

      expect(first).toBeChecked();
      expect(first).toHaveFocus();
    });
  });

  describe('accessibility', () => {
    it('has radiogroup role', () => {
      render(
        <RadioGroup name="test" aria-label="Test">
          <Radio name="test" label="Option" />
        </RadioGroup>,
      );

      expect(screen.getByRole('radiogroup')).toBeInTheDocument();
    });

    it('supports aria-label for accessible name', () => {
      render(
        <RadioGroup name="test" aria-label="Choose your preference">
          <Radio name="test" label="Option" />
        </RadioGroup>,
      );

      const group = screen.getByRole('radiogroup', { name: 'Choose your preference' });
      expect(group).toBeInTheDocument();
    });

    it('supports aria-labelledby for accessible name', () => {
      render(
        <div>
          <h2 id="preferences">Preferences</h2>
          <RadioGroup name="test" aria-labelledby="preferences">
            <Radio name="test" label="Option" />
          </RadioGroup>
        </div>,
      );

      const group = screen.getByRole('radiogroup');
      expect(group).toHaveAttribute('aria-labelledby', 'preferences');
    });

    it('contains radio buttons with correct role', () => {
      render(
        <RadioGroup name="test" aria-label="Test">
          <Radio name="test" label="Option 1" />
          <Radio name="test" label="Option 2" />
        </RadioGroup>,
      );

      const radios = screen.getAllByRole('radio');
      expect(radios).toHaveLength(2);
    });
  });

  describe('focus management', () => {
    it('moves focus with arrow keys', async () => {
      const user = userEvent.setup();

      render(<RadioGroupHarness />);

      const first = screen.getByLabelText('First');
      const second = screen.getByLabelText('Second');
      const third = screen.getByLabelText('Third');

      first.focus();
      expect(first).toHaveFocus();

      await user.keyboard('{ArrowRight}');
      expect(second).toHaveFocus();

      await user.keyboard('{ArrowRight}');
      expect(third).toHaveFocus();
    });

    it('maintains focus when wrapping', async () => {
      const user = userEvent.setup();

      render(<RadioGroupHarness />);

      const first = screen.getByLabelText('First');
      const third = screen.getByLabelText('Third');

      third.focus();
      await user.keyboard('{ArrowRight}');

      expect(first).toHaveFocus();
    });
  });

  describe('real-world chaos', () => {
    it('handles rapid mount and unmount', () => {
      for (let i = 0; i < 10; i++) {
        const { unmount } = render(
          <RadioGroup name="test" aria-label="Test">
            <Radio name="test" label={`Option ${String(i)}`} />
          </RadioGroup>,
        );

        expect(screen.getByRole('radiogroup')).toBeInTheDocument();

        unmount();
      }
    });

    it('handles className changes while mounted', () => {
      const { rerender } = render(
        <RadioGroup name="test" aria-label="Test" className="class1">
          <Radio name="test" label="Option" />
        </RadioGroup>,
      );

      const group = screen.getByRole('radiogroup');
      expect(group).toHaveClass('class1');

      rerender(
        <RadioGroup name="test" aria-label="Test" className="class2">
          <Radio name="test" label="Option" />
        </RadioGroup>,
      );

      expect(group).not.toHaveClass('class1');
      expect(group).toHaveClass('class2');
    });

    it('handles aria-label changes while mounted', () => {
      const { rerender } = render(
        <RadioGroup name="test" aria-label="Label 1">
          <Radio name="test" label="Option" />
        </RadioGroup>,
      );

      expect(screen.getByRole('radiogroup', { name: 'Label 1' })).toBeInTheDocument();

      rerender(
        <RadioGroup name="test" aria-label="Label 2">
          <Radio name="test" label="Option" />
        </RadioGroup>,
      );

      expect(screen.queryByRole('radiogroup', { name: 'Label 1' })).not.toBeInTheDocument();
      expect(screen.getByRole('radiogroup', { name: 'Label 2' })).toBeInTheDocument();
    });
  });

  describe('integration with Radio', () => {
    it('selects radio on arrow key navigation', async () => {
      const user = userEvent.setup();

      render(<RadioGroupHarness />);

      const first = screen.getByLabelText('First');
      const second = screen.getByLabelText('Second');

      expect(first).toBeChecked();
      expect(second).not.toBeChecked();

      first.focus();
      await user.keyboard('{ArrowRight}');

      expect(first).not.toBeChecked();
      expect(second).toBeChecked();
    });

    it('clicking and keyboard navigation work together', async () => {
      const user = userEvent.setup();

      render(<RadioGroupHarness />);

      const first = screen.getByLabelText('First');
      const second = screen.getByLabelText('Second');
      const third = screen.getByLabelText('Third');

      // Click second
      await user.click(second);
      expect(second).toBeChecked();

      // Use keyboard to go to third
      await user.keyboard('{ArrowRight}');
      expect(third).toBeChecked();

      // Use keyboard to go back to first
      await user.keyboard('{Home}');
      expect(first).toBeChecked();
    });
  });

  describe('RadioGroup Control Tests)', () => {
    it('controls children via value prop (controlled mode)', () => {
      render(
        <RadioGroup name="controlled" value="b" onValueChange={() => {}}>
          <Radio value="a" label="Option A" />
          <Radio value="b" label="Option B" />
          <Radio value="c" label="Option C" />
        </RadioGroup>,
      );

      const radioA = screen.getByLabelText('Option A');
      const radioB = screen.getByLabelText('Option B');
      const radioC = screen.getByLabelText('Option C');

      expect(radioA).not.toBeChecked();
      expect(radioB).toBeChecked(); // Should be checked because RadioGroup value is 'b'
      expect(radioC).not.toBeChecked();
    });

    it('calls onValueChange when selection changes', async () => {
      const user = userEvent.setup();
      const handleValueChange = vi.fn();

      render(
        <RadioGroup name="controlled" defaultValue="a" onValueChange={handleValueChange}>
          <Radio value="a" label="Option A" />
          <Radio value="b" label="Option B" />
        </RadioGroup>,
      );

      const radioB = screen.getByLabelText('Option B');

      await user.click(radioB);

      expect(handleValueChange).toHaveBeenCalledTimes(1);
      expect(handleValueChange).toHaveBeenCalledWith('b');
    });

    it('provides name to children via context (avoid prop drilling)', () => {
      render(
        <RadioGroup name="context-group">
          <Radio value="1" label="One" />
          <Radio value="2" label="Two" />
        </RadioGroup>,
      );

      const radio1 = screen.getByLabelText('One');
      const radio2 = screen.getByLabelText('Two');

      expect(radio1).toHaveAttribute('name', 'context-group');
      expect(radio2).toHaveAttribute('name', 'context-group');
    });

    it('skips disabled items during keyboard navigation', async () => {
      const user = userEvent.setup();

      render(
        <RadioGroup name="disabled-nav" defaultValue="1">
          <Radio value="1" label="One" />
          <Radio value="2" label="Two" disabled />
          <Radio value="3" label="Three" />
        </RadioGroup>,
      );

      const radio1 = screen.getByLabelText('One');
      const radio3 = screen.getByLabelText('Three');

      radio1.focus();
      await user.keyboard('{ArrowRight}');

      // Should skip "Two" and go straight to "Three"
      expect(radio3).toHaveFocus();
      expect(radio3).toBeChecked();
    });
  });
});
