// packages/ui/src/primitives/__tests__/Checkbox.test.tsx
/** @vitest-environment jsdom */
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { Checkbox } from '../Checkbox';

describe('Checkbox', () => {
  describe('happy path', () => {
    it('renders with default unchecked state', () => {
      render(<Checkbox />);

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toBeInTheDocument();
      expect(checkbox).not.toBeChecked();
    });

    it('toggles checked state on click with userEvent', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();

      render(<Checkbox defaultChecked={false} onChange={onChange} />);

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).not.toBeChecked();

      await user.click(checkbox);

      expect(onChange).toHaveBeenCalledWith(true);
      expect(checkbox).toBeChecked();
    });

    it('toggles from checked to unchecked', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();

      render(<Checkbox defaultChecked={true} onChange={onChange} />);

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toBeChecked();

      await user.click(checkbox);

      expect(onChange).toHaveBeenCalledWith(false);
      expect(checkbox).not.toBeChecked();
    });

    it('works in controlled mode', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();

      const { rerender } = render(<Checkbox checked={false} onChange={onChange} />);

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).not.toBeChecked();

      await user.click(checkbox);
      expect(onChange).toHaveBeenCalledWith(true);

      // Simulate parent updating the prop
      rerender(<Checkbox checked={true} onChange={onChange} />);
      expect(checkbox).toBeChecked();
    });

    it('forwards className to label element', () => {
      render(<Checkbox className="custom-class" />);

      const label = document.querySelector('.ui-checkbox');
      expect(label).toHaveClass('ui-checkbox');
      expect(label).toHaveClass('custom-class');
    });

    it('forwards ref to input element', () => {
      const ref = { current: null };
      render(<Checkbox ref={ref} />);

      expect(ref.current).toBeInstanceOf(HTMLInputElement);
      expect(ref.current).toHaveAttribute('type', 'checkbox');
    });

    it('renders with label', () => {
      render(<Checkbox label="Accept terms" />);

      expect(screen.getByText('Accept terms')).toBeInTheDocument();
      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toBeInTheDocument();
    });

    it('renders without label', () => {
      render(<Checkbox />);

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toBeInTheDocument();

      const label = checkbox.closest('label');
      expect(label?.textContent).toBe('');
    });

    it('uses defaultChecked when uncontrolled', () => {
      render(<Checkbox defaultChecked label="Default checked" />);

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toBeChecked();
    });

    it('shows checkmark indicator when checked', () => {
      render(<Checkbox defaultChecked />);

      const indicator = document.querySelector('.ui-checkbox-box');
      expect(indicator).toHaveAttribute('data-checked', 'true');
      expect(indicator).toHaveTextContent('✓');
    });

    it('hides checkmark indicator when unchecked', () => {
      render(<Checkbox defaultChecked={false} />);

      const indicator = document.querySelector('.ui-checkbox-box');
      expect(indicator).toHaveAttribute('data-checked', 'false');
      expect(indicator).toHaveTextContent('');
    });
  });

  describe('edge cases - missing/invalid props', () => {
    it('renders without onChange handler', async () => {
      const user = userEvent.setup();

      expect(() => {
        render(<Checkbox />);
      }).not.toThrow();

      const checkbox = screen.getByRole('checkbox');

      // Should not crash when clicked without onChange
      await user.click(checkbox);
      expect(checkbox).toBeInTheDocument();
    });

    it('handles null onChange gracefully', async () => {
      const user = userEvent.setup();

      // @ts-expect-error Testing invalid prop
      render(<Checkbox onChange={null} />);

      const checkbox = screen.getByRole('checkbox');
      await user.click(checkbox);

      // Should toggle even without onChange
      expect(checkbox).toBeChecked();
    });

    it('handles undefined defaultChecked', () => {
      render(<Checkbox defaultChecked={undefined} />);

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).not.toBeChecked();
    });

    it('handles undefined checked in controlled mode', () => {
      render(<Checkbox checked={undefined} />);

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).not.toBeChecked();
    });

    it('handles null label', () => {
      render(<Checkbox label={null} />);

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toBeInTheDocument();

      const label = checkbox.closest('label');
      expect(label?.querySelector('span:last-child')).not.toBeInTheDocument();
    });

    it('handles undefined label', () => {
      render(<Checkbox label={undefined} />);

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toBeInTheDocument();

      const label = checkbox.closest('label');
      expect(label?.querySelector('span:last-child')).not.toBeInTheDocument();
    });

    it('handles empty string label', () => {
      render(<Checkbox label="" />);

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toBeInTheDocument();

      // Empty string is falsy, so no span should be rendered
      const label = checkbox.closest('label');
      expect(label?.querySelector('span:last-child')).not.toBeInTheDocument();
    });
  });

  describe('edge cases - boundary conditions', () => {
    it('handles rapid clicking without breaking', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();

      render(<Checkbox onChange={onChange} />);
      const checkbox = screen.getByRole('checkbox');

      // Rapid clicks (20 times)
      for (let i = 0; i < 20; i++) {
        await user.click(checkbox);
      }

      // Should have toggled 20 times
      expect(onChange).toHaveBeenCalledTimes(20);
      // Final state should be unchecked (even number of clicks)
      expect(checkbox).not.toBeChecked();
    });

    it('handles rapid prop changes in controlled mode', () => {
      const { rerender } = render(<Checkbox checked={false} />);
      const checkbox = screen.getByRole('checkbox');

      // Rapid prop changes
      for (let i = 0; i < 10; i++) {
        rerender(<Checkbox checked={i % 2 === 0} />);
      }

      expect(checkbox).not.toBeChecked();
    });
  });

  describe('edge cases - cleanup', () => {
    it('cleans up properly on unmount', () => {
      const ref = { current: null };
      const { unmount } = render(<Checkbox ref={ref} />);

      expect(ref.current).toBeInstanceOf(HTMLInputElement);

      unmount();

      expect(ref.current).not.toBeInTheDocument();
    });
  });

  describe('edge cases - special characters', () => {
    it('handles label with special characters and HTML', () => {
      const labelText = `<script>alert('xss')</script> & special chars: <>&"'`;
      render(<Checkbox label={labelText} />);

      const label = screen.getByText(/script.*alert.*xss.*script/i);
      expect(label).toBeInTheDocument();
      expect(label.textContent).toContain('<script>');
      expect(label.textContent).toContain('&');
    });

    it('handles className with special characters', () => {
      render(<Checkbox className="test-class__with--special___chars" />);

      const label = document.querySelector('.ui-checkbox');
      expect(label).toHaveClass('test-class__with--special___chars');
    });

    it('handles empty className', () => {
      render(<Checkbox className="" />);

      const label = document.querySelector('.ui-checkbox');
      expect(label).toHaveClass('ui-checkbox');
      expect(label?.className).toBe('ui-checkbox');
    });
  });

  describe('user interactions - keyboard', () => {
    it('can be focused with Tab key', async () => {
      const user = userEvent.setup();

      render(
        <div>
          <button>Before</button>
          <Checkbox label="Test" />
          <button>After</button>
        </div>,
      );

      const checkbox = screen.getByRole('checkbox');

      // Tab to checkbox
      await user.tab();
      await user.tab();

      expect(checkbox).toHaveFocus();
    });

    it('toggles with Space key', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();

      render(<Checkbox onChange={onChange} />);
      const checkbox = screen.getByRole('checkbox');

      checkbox.focus();
      await user.keyboard(' ');

      expect(onChange).toHaveBeenCalledWith(true);
      expect(checkbox).toBeChecked();
    });

    it('toggles with Enter key', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();

      render(<Checkbox onChange={onChange} />);
      const checkbox = screen.getByRole('checkbox');

      checkbox.focus();
      await user.keyboard('{Enter}');

      expect(onChange).toHaveBeenCalledWith(true);
      expect(checkbox).toBeChecked();
    });

    it('maintains focus after toggle', async () => {
      const user = userEvent.setup();

      render(<Checkbox />);
      const checkbox = screen.getByRole('checkbox');

      checkbox.focus();
      expect(checkbox).toHaveFocus();

      await user.click(checkbox);

      expect(checkbox).toHaveFocus();
    });
  });

  describe('user interactions - mouse/touch', () => {
    it('handles double-click without breaking', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();

      render(<Checkbox onChange={onChange} />);
      const checkbox = screen.getByRole('checkbox');

      await user.dblClick(checkbox);

      // Double click = 2 clicks = 2 toggles
      expect(onChange).toHaveBeenCalledTimes(2);
      // Final state should be unchecked (even number of clicks)
      expect(checkbox).not.toBeChecked();
    });

    it('handles focus and blur events', async () => {
      const handleFocus = vi.fn();
      const handleBlur = vi.fn();
      const user = userEvent.setup();

      render(<Checkbox onFocus={handleFocus} onBlur={handleBlur} />);
      const checkbox = screen.getByRole('checkbox');

      await user.click(checkbox);
      expect(handleFocus).toHaveBeenCalled();

      await user.tab(); // Tab away to blur
      expect(handleBlur).toHaveBeenCalled();
    });

    it('clicking label toggles checkbox', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();

      render(<Checkbox label="Click me" onChange={onChange} />);

      const label = screen.getByText('Click me');
      await user.click(label);

      expect(onChange).toHaveBeenCalledWith(true);

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toBeChecked();
    });
  });

  describe('disabled state', () => {
    it('respects disabled attribute', () => {
      render(<Checkbox disabled />);

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toBeDisabled();
    });

    it('does not toggle when disabled', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();

      render(<Checkbox disabled onChange={onChange} />);
      const checkbox = screen.getByRole('checkbox');

      await user.click(checkbox);

      expect(onChange).not.toHaveBeenCalled();
      expect(checkbox).not.toBeChecked();
    });

    it('does not respond to keyboard when disabled', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();

      render(<Checkbox disabled onChange={onChange} />);
      const checkbox = screen.getByRole('checkbox');

      checkbox.focus();
      await user.keyboard(' ');

      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe('accessibility', () => {
    it('uses correct role attribute', () => {
      render(<Checkbox />);

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toBeInTheDocument();
      expect(checkbox).toHaveAttribute('type', 'checkbox');
    });

    it('has accessible label association', () => {
      render(<Checkbox label="Subscribe to newsletter" />);

      const checkbox = screen.getByRole('checkbox');
      const label = checkbox.closest('label');

      expect(label).toBeInTheDocument();
      expect(within(label!).getByText('Subscribe to newsletter')).toBeInTheDocument();
    });

    it('updates checked state in DOM', async () => {
      const user = userEvent.setup();
      render(<Checkbox />);

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).not.toBeChecked();

      await user.click(checkbox);
      expect(checkbox).toBeChecked();
    });

    it('visual indicator matches checked state', async () => {
      const user = userEvent.setup();
      render(<Checkbox />);

      const checkbox = screen.getByRole('checkbox');
      const indicator = document.querySelector('.ui-checkbox-box');

      expect(indicator).toHaveAttribute('data-checked', 'false');
      expect(indicator).toHaveTextContent('');

      await user.click(checkbox);

      expect(indicator).toHaveAttribute('data-checked', 'true');
      expect(indicator).toHaveTextContent('✓');
    });

    it('forwards ARIA attributes', () => {
      render(<Checkbox aria-label="Custom label" aria-describedby="description" />);

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toHaveAttribute('aria-label', 'Custom label');
      expect(checkbox).toHaveAttribute('aria-describedby', 'description');
    });
  });
});
