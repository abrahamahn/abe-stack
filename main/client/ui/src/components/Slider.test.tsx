// main/client/ui/src/components/Slider.test.tsx
/** @vitest-environment jsdom */
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import { Slider } from './Slider';

describe('Slider', () => {
  describe('happy path', () => {
    it('renders slider with default values', () => {
      render(<Slider />);
      const slider = screen.getByRole('slider');
      expect(slider).toBeInTheDocument();
      expect(slider).toHaveAttribute('min', '0');
      expect(slider).toHaveAttribute('max', '100');
      expect(slider).toHaveAttribute('step', '1');
      expect(slider).toHaveValue('0');
    });

    it('emits numeric values on change', () => {
      const onChange = vi.fn();
      render(<Slider defaultValue={10} onChange={onChange} />);

      const slider = screen.getByRole('slider');
      fireEvent.change(slider, { target: { value: '42' } });

      expect(onChange).toHaveBeenCalledWith(42);
      expect(slider).toHaveValue('42');
    });

    it('respects min/max props', () => {
      render(<Slider min={10} max={20} defaultValue={15} />);
      const slider = screen.getByRole('slider');
      expect(slider).toHaveAttribute('min', '10');
      expect(slider).toHaveAttribute('max', '20');
      expect(slider).toHaveValue('15');
    });
  });

  describe('edge cases - boundaries and constraints', () => {
    it('clamps initial value to min if lower', () => {
      // NOTE: HTML range input might not auto-clamp value in JSDOM if defaultValue is set directly?
      // Actually standard behavior is to respect min/max constraints visually/logically.
      render(<Slider min={10} max={100} defaultValue={5} />);
      const slider = screen.getByRole('slider');
      // If we pass 5 to value, input will try to hold it, but validation might apply.
      // Let's see if our logic does clamping.
      // Current implementation passes value directly to input.
      expect(slider).toHaveValue('10'); // Expecting our component to clamp or input to handle it
    });

    it('clamps initial value to max if higher', () => {
      render(<Slider min={0} max={50} defaultValue={100} />);
      const slider = screen.getByRole('slider');
      expect(slider).toHaveValue('50');
    });

    it('handles negative min/max values', () => {
      const onChange = vi.fn();
      render(<Slider min={-50} max={-10} defaultValue={-25} onChange={onChange} />);
      const slider = screen.getByRole('slider');

      expect(slider).toHaveValue('-25');

      fireEvent.change(slider, { target: { value: '-40' } });
      expect(onChange).toHaveBeenCalledWith(-40);
    });

    it('handles decimal steps', () => {
      const onChange = vi.fn();
      render(<Slider min={0} max={1} step={0.1} defaultValue={0.5} onChange={onChange} />);
      const slider = screen.getByRole('slider');

      fireEvent.change(slider, { target: { value: '0.6' } });
      expect(onChange).toHaveBeenCalledWith(0.6);
    });
  });

  describe('keyboard interaction', () => {
    it('increments by step on ArrowRight', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<Slider min={0} max={100} step={5} defaultValue={50} onChange={onChange} />);

      const slider = screen.getByRole('slider');
      slider.focus();
      await user.keyboard('{ArrowRight}');

      // userEvent might not trigger native range input updates in JSDOM flawlessly without some help or specific JSDOM config,
      // but let's try standard behavior.
      // If this fails, we might rely on browser behavior which JSDOM partially mocks.
      // userEvent.type or keyboard on range inputs is tricky in JSDOM.
      // Often fireEvent is needed for range inputs in JSDOM environments if userEvent doesn't move handle.
      // Let's assume standard behavior first.

      // NOTE: JSDOM range input support for keyboard is limited.
      // We might need to handle onKeyDown if we want robust cross-browser keyboard support beyond native.
      // But let's check if the native input handles it or if our onChange fires.

      expect(slider).toHaveValue('55');
      expect(onChange).toHaveBeenCalledWith(55);
    });

    it('decrements by step on ArrowLeft', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<Slider min={0} max={100} step={10} defaultValue={50} onChange={onChange} />);

      const slider = screen.getByRole('slider');
      slider.focus();
      await user.keyboard('{ArrowLeft}');

      expect(slider).toHaveValue('40');
      expect(onChange).toHaveBeenCalledWith(40);
    });
  });

  describe('controlled vs uncontrolled', () => {
    it('works uncontrolled', () => {
      render(<Slider defaultValue={10} />);
      const slider = screen.getByRole('slider');
      expect(slider).toHaveValue('10');

      fireEvent.change(slider, { target: { value: '20' } });
      expect(slider).toHaveValue('20');
    });

    it('works controlled', () => {
      const onChange = vi.fn();
      const { rerender } = render(<Slider value={10} onChange={onChange} />);
      const slider = screen.getByRole('slider');

      expect(slider).toHaveValue('10');

      fireEvent.change(slider, { target: { value: '20' } });
      expect(onChange).toHaveBeenCalledWith(20);
      // Should not update visually if prop doesn't change (controlled)
      // Note: React 18/19 input behavior might show optimistic update before revert if not state-driven synchronously
      // But generally controlled input stays at prop value

      rerender(<Slider value={20} onChange={onChange} />);
      expect(slider).toHaveValue('20');
    });
  });

  describe('accessibility', () => {
    it('has correct role', () => {
      render(<Slider aria-label="Volume" />);
      expect(screen.getByRole('slider', { name: 'Volume' })).toBeInTheDocument();
    });

    it('supports aria-valuetext', () => {
      render(<Slider value={50} aria-valuetext="50 percent" aria-label="Progress" />);
      const slider = screen.getByRole('slider');
      expect(slider).toHaveAttribute('aria-valuetext', '50 percent');
    });

    it('forwards disabled state', () => {
      render(<Slider disabled />);
      expect(screen.getByRole('slider')).toBeDisabled();
    });
  });
});
