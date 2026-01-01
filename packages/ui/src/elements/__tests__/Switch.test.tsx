// packages/ui/src/elements/__tests__/Switch.test.tsx
/** @vitest-environment jsdom */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { Switch } from '../Switch';

describe('Switch', () => {
  describe('happy path', () => {
    it('renders with default unchecked state', () => {
      render(<Switch />);

      const switchElement = screen.getByRole('switch');
      expect(switchElement).toBeInTheDocument();
      expect(switchElement).toHaveAttribute('aria-checked', 'false');
      expect(switchElement).toHaveAttribute('type', 'button');
    });

    it('toggles checked state on click with userEvent', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();

      render(<Switch defaultChecked={false} onChange={onChange} />);

      const switchElement = screen.getByRole('switch');
      expect(switchElement).toHaveAttribute('aria-checked', 'false');

      await user.click(switchElement);

      expect(onChange).toHaveBeenCalledWith(true);
      expect(switchElement).toHaveAttribute('aria-checked', 'true');
    });

    it('toggles from checked to unchecked', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();

      render(<Switch defaultChecked={true} onChange={onChange} />);

      const switchElement = screen.getByRole('switch');
      expect(switchElement).toHaveAttribute('aria-checked', 'true');

      await user.click(switchElement);

      expect(onChange).toHaveBeenCalledWith(false);
      expect(switchElement).toHaveAttribute('aria-checked', 'false');
    });

    it('works in controlled mode', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();

      const { rerender } = render(<Switch checked={false} onChange={onChange} />);

      const switchElement = screen.getByRole('switch');
      expect(switchElement).toHaveAttribute('aria-checked', 'false');

      await user.click(switchElement);
      expect(onChange).toHaveBeenCalledWith(true);

      // Simulate parent updating the prop
      rerender(<Switch checked={true} onChange={onChange} />);
      expect(switchElement).toHaveAttribute('aria-checked', 'true');
    });

    it('forwards className to root element', () => {
      render(<Switch className="custom-class" />);

      const switchElement = screen.getByRole('switch');
      expect(switchElement).toHaveClass('ui-switch');
      expect(switchElement).toHaveClass('custom-class');
    });

    it('forwards ref to button element', () => {
      const ref = { current: null };
      render(<Switch ref={ref} />);

      expect(ref.current).toBeInstanceOf(HTMLButtonElement);
      expect(ref.current).toHaveAttribute('role', 'switch');
    });
  });

  describe('edge cases - missing/invalid props', () => {
    it('renders without onChange handler', async () => {
      const user = userEvent.setup();

      expect(() => {
        render(<Switch />);
      }).not.toThrow();

      const switchElement = screen.getByRole('switch');

      // Should not crash when clicked without onChange
      await user.click(switchElement);
      expect(switchElement).toBeInTheDocument();
    });

    it('handles null onChange gracefully', async () => {
      const user = userEvent.setup();

      // @ts-expect-error Testing invalid prop
      render(<Switch onChange={null} />);

      const switchElement = screen.getByRole('switch');
      await user.click(switchElement);

      // Should toggle even without onChange
      expect(switchElement).toHaveAttribute('aria-checked', 'true');
    });

    it('handles undefined defaultChecked', () => {
      render(<Switch defaultChecked={undefined} />);

      const switchElement = screen.getByRole('switch');
      expect(switchElement).toHaveAttribute('aria-checked', 'false');
    });

    it('handles undefined checked in controlled mode', () => {
      render(<Switch checked={undefined} />);

      const switchElement = screen.getByRole('switch');
      expect(switchElement).toHaveAttribute('aria-checked', 'false');
    });
  });

  describe('edge cases - boundary conditions', () => {
    it('handles rapid clicking without breaking', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();

      render(<Switch onChange={onChange} />);
      const switchElement = screen.getByRole('switch');

      // Rapid clicks (20 times)
      for (let i = 0; i < 20; i++) {
        await user.click(switchElement);
      }

      // Should have toggled 20 times
      expect(onChange).toHaveBeenCalledTimes(20);
      // Final state should be checked (even number of clicks)
      expect(switchElement).toHaveAttribute('aria-checked', 'false');
    });

    it('handles rapid prop changes in controlled mode', () => {
      const { rerender } = render(<Switch checked={false} />);
      const switchElement = screen.getByRole('switch');

      // Rapid prop changes
      for (let i = 0; i < 10; i++) {
        rerender(<Switch checked={i % 2 === 0} />);
      }

      expect(switchElement).toHaveAttribute('aria-checked', 'false');
    });
  });

  describe('edge cases - cleanup', () => {
    it('cleans up properly on unmount', () => {
      const ref = { current: null };
      const { unmount } = render(<Switch ref={ref} />);

      expect(ref.current).toBeInstanceOf(HTMLButtonElement);

      unmount();

      expect(ref.current).not.toBeInTheDocument();
    });
  });

  describe('edge cases - special characters', () => {
    it('handles className with special characters', () => {
      render(<Switch className="test-class__with--special___chars" />);

      const switchElement = screen.getByRole('switch');
      expect(switchElement).toHaveClass('test-class__with--special___chars');
    });

    it('handles empty className', () => {
      render(<Switch className="" />);

      const switchElement = screen.getByRole('switch');
      expect(switchElement).toHaveClass('ui-switch');
      expect(switchElement.className).toBe('ui-switch');
    });
  });

  describe('user interactions - keyboard', () => {
    it('can be focused with Tab key', async () => {
      const user = userEvent.setup();

      render(
        <div>
          <button>Before</button>
          <Switch />
          <button>After</button>
        </div>,
      );

      const switchElement = screen.getByRole('switch');

      // Tab to switch
      await user.tab();
      await user.tab();

      expect(switchElement).toHaveFocus();
    });

    it('toggles with Space key', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();

      render(<Switch onChange={onChange} />);
      const switchElement = screen.getByRole('switch');

      switchElement.focus();
      await user.keyboard(' ');

      expect(onChange).toHaveBeenCalledWith(true);
      expect(switchElement).toHaveAttribute('aria-checked', 'true');
    });

    it('toggles with Enter key', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();

      render(<Switch onChange={onChange} />);
      const switchElement = screen.getByRole('switch');

      switchElement.focus();
      await user.keyboard('{Enter}');

      expect(onChange).toHaveBeenCalledWith(true);
      expect(switchElement).toHaveAttribute('aria-checked', 'true');
    });

    it('maintains focus after toggle', async () => {
      const user = userEvent.setup();

      render(<Switch />);
      const switchElement = screen.getByRole('switch');

      switchElement.focus();
      expect(switchElement).toHaveFocus();

      await user.click(switchElement);

      expect(switchElement).toHaveFocus();
    });
  });

  describe('user interactions - mouse/touch', () => {
    it('handles double-click without breaking', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();

      render(<Switch onChange={onChange} />);
      const switchElement = screen.getByRole('switch');

      await user.dblClick(switchElement);

      // Double click = 2 clicks = 2 toggles
      expect(onChange).toHaveBeenCalledTimes(2);
    });

    it('handles focus and blur events', async () => {
      const handleFocus = vi.fn();
      const handleBlur = vi.fn();
      const user = userEvent.setup();

      render(<Switch onFocus={handleFocus} onBlur={handleBlur} />);
      const switchElement = screen.getByRole('switch');

      await user.click(switchElement);
      expect(handleFocus).toHaveBeenCalled();

      await user.tab(); // Tab away to blur
      expect(handleBlur).toHaveBeenCalled();
    });
  });

  describe('disabled state', () => {
    it('respects disabled attribute', () => {
      render(<Switch disabled />);

      const switchElement = screen.getByRole('switch');
      expect(switchElement).toBeDisabled();
    });

    it('does not toggle when disabled', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();

      render(<Switch disabled onChange={onChange} />);
      const switchElement = screen.getByRole('switch');

      await user.click(switchElement);

      expect(onChange).not.toHaveBeenCalled();
      expect(switchElement).toHaveAttribute('aria-checked', 'false');
    });

    it('does not respond to keyboard when disabled', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();

      render(<Switch disabled onChange={onChange} />);
      const switchElement = screen.getByRole('switch');

      switchElement.focus();
      await user.keyboard(' ');

      expect(onChange).not.toHaveBeenCalled();
    });
  });
});
