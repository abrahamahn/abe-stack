// packages/ui/src/elements/__tests__/Progress.test.tsx
/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Progress } from '../Progress';

describe('Progress', () => {
  describe('happy path', () => {
    it('renders progress bar with value', () => {
      render(<Progress value={50} />);

      const progress = screen.getByRole('progressbar');
      expect(progress).toBeInTheDocument();
      expect(progress).toHaveAttribute('aria-valuenow', '50');
    });

    it('renders progress bar at 0%', () => {
      render(<Progress value={0} />);

      const progress = screen.getByRole('progressbar');
      expect(progress).toHaveAttribute('aria-valuenow', '0');

      const bar = progress.querySelector('.ui-progress-bar');
      expect(bar).toHaveStyle('width: 0%');
    });

    it('renders progress bar at 100%', () => {
      render(<Progress value={100} />);

      const progress = screen.getByRole('progressbar');
      expect(progress).toHaveAttribute('aria-valuenow', '100');

      const bar = progress.querySelector('.ui-progress-bar');
      expect(bar).toHaveStyle('width: 100%');
    });

    it('renders progress bar at 50%', () => {
      render(<Progress value={50} />);

      const progress = screen.getByRole('progressbar');
      const bar = progress.querySelector('.ui-progress-bar');
      expect(bar).toHaveStyle('width: 50%');
    });

    it('has correct aria attributes', () => {
      render(<Progress value={75} />);

      const progress = screen.getByRole('progressbar');
      expect(progress).toHaveAttribute('aria-valuenow', '75');
      expect(progress).toHaveAttribute('aria-valuemin', '0');
      expect(progress).toHaveAttribute('aria-valuemax', '100');
    });
  });

  describe('edge cases - value clamping', () => {
    it('clamps value above 100', () => {
      render(<Progress value={120} />);

      const progress = screen.getByRole('progressbar');
      expect(progress).toHaveAttribute('aria-valuenow', '100');

      const bar = progress.querySelector('.ui-progress-bar');
      expect(bar).toHaveStyle('width: 100%');
    });

    it('clamps negative value to 0', () => {
      render(<Progress value={-10} />);

      const progress = screen.getByRole('progressbar');
      expect(progress).toHaveAttribute('aria-valuenow', '0');

      const bar = progress.querySelector('.ui-progress-bar');
      expect(bar).toHaveStyle('width: 0%');
    });

    it('clamps very large value', () => {
      render(<Progress value={9999} />);

      const progress = screen.getByRole('progressbar');
      expect(progress).toHaveAttribute('aria-valuenow', '100');
    });

    it('clamps very negative value', () => {
      render(<Progress value={-9999} />);

      const progress = screen.getByRole('progressbar');
      expect(progress).toHaveAttribute('aria-valuenow', '0');
    });

    it('handles NaN value', () => {
      render(<Progress value={NaN} />);

      const progress = screen.getByRole('progressbar');
      // NaN clamped to 0
      expect(progress).toHaveAttribute('aria-valuenow', '0');
    });

    it('handles Infinity value', () => {
      render(<Progress value={Infinity} />);

      const progress = screen.getByRole('progressbar');
      // Infinity clamped to 100
      expect(progress).toHaveAttribute('aria-valuenow', '100');
    });

    it('handles -Infinity value', () => {
      render(<Progress value={-Infinity} />);

      const progress = screen.getByRole('progressbar');
      // -Infinity clamped to 0
      expect(progress).toHaveAttribute('aria-valuenow', '0');
    });
  });

  describe('edge cases - decimal values', () => {
    it('handles decimal value correctly', () => {
      render(<Progress value={33.33} />);

      const progress = screen.getByRole('progressbar');
      expect(progress).toHaveAttribute('aria-valuenow', '33.33');

      const bar = progress.querySelector('.ui-progress-bar');
      expect(bar).toHaveStyle('width: 33.33%');
    });

    it('handles value close to 0', () => {
      render(<Progress value={0.1} />);

      const progress = screen.getByRole('progressbar');
      expect(progress).toHaveAttribute('aria-valuenow', '0.1');
    });

    it('handles value close to 100', () => {
      render(<Progress value={99.9} />);

      const progress = screen.getByRole('progressbar');
      expect(progress).toHaveAttribute('aria-valuenow', '99.9');
    });
  });

  describe('prop forwarding', () => {
    it('forwards className to container', () => {
      render(<Progress value={50} className="custom-progress" />);

      const progress = screen.getByRole('progressbar');
      expect(progress).toHaveClass('ui-progress');
      expect(progress).toHaveClass('custom-progress');
    });

    it('handles empty className', () => {
      render(<Progress value={50} className="" />);

      const progress = screen.getByRole('progressbar');
      expect(progress).toHaveClass('ui-progress');
      expect(progress.className).toBe('ui-progress');
    });

    it('forwards style to container', () => {
      render(<Progress value={50} style={{ backgroundColor: 'red' }} />);

      const progress = screen.getByRole('progressbar');
      expect(progress).toHaveStyle('background-color: rgb(255, 0, 0)');
    });

    it('forwards ref to container element', () => {
      const ref = { current: null };
      render(<Progress ref={ref} value={50} />);

      expect(ref.current).toBeInstanceOf(HTMLDivElement);
      expect(ref.current).toHaveClass('ui-progress');
    });

    it('forwards data attributes', () => {
      render(<Progress value={50} data-testid="progress-bar" data-custom="value" />);

      const progress = screen.getByRole('progressbar');
      expect(progress).toHaveAttribute('data-testid', 'progress-bar');
      expect(progress).toHaveAttribute('data-custom', 'value');
    });

    it('forwards aria attributes', () => {
      render(<Progress value={50} aria-label="Loading progress" />);

      const progress = screen.getByRole('progressbar');
      expect(progress).toHaveAttribute('aria-label', 'Loading progress');
    });
  });

  describe('real-world chaos', () => {
    it('handles rapid value changes', () => {
      const { rerender } = render(<Progress value={0} />);

      const progress = screen.getByRole('progressbar');

      // Rapidly change values
      for (let i = 0; i <= 100; i += 10) {
        rerender(<Progress value={i} />);
        expect(progress).toHaveAttribute('aria-valuenow', String(i));
      }
    });

    it('handles alternating min/max values', () => {
      const { rerender } = render(<Progress value={0} />);

      const progress = screen.getByRole('progressbar');

      for (let i = 0; i < 10; i++) {
        rerender(<Progress value={i % 2 === 0 ? 0 : 100} />);
        expect(progress).toHaveAttribute('aria-valuenow', i % 2 === 0 ? '0' : '100');
      }
    });

    it('handles rapid mount and unmount', () => {
      for (let i = 0; i < 20; i++) {
        const { unmount } = render(<Progress value={50} />);

        expect(screen.getByRole('progressbar')).toBeInTheDocument();

        unmount();
      }
    });

    it('handles className changes while mounted', () => {
      const { rerender } = render(<Progress value={50} className="class1" />);

      const progress = screen.getByRole('progressbar');
      expect(progress).toHaveClass('class1');

      rerender(<Progress value={50} className="class2" />);
      expect(progress).not.toHaveClass('class1');
      expect(progress).toHaveClass('class2');
    });
  });

  describe('accessibility', () => {
    it('has progressbar role', () => {
      render(<Progress value={50} />);

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('has aria-valuenow matching current value', () => {
      render(<Progress value={75} />);

      const progress = screen.getByRole('progressbar');
      expect(progress).toHaveAttribute('aria-valuenow', '75');
    });

    it('has aria-valuemin of 0', () => {
      render(<Progress value={50} />);

      const progress = screen.getByRole('progressbar');
      expect(progress).toHaveAttribute('aria-valuemin', '0');
    });

    it('has aria-valuemax of 100', () => {
      render(<Progress value={50} />);

      const progress = screen.getByRole('progressbar');
      expect(progress).toHaveAttribute('aria-valuemax', '100');
    });

    it('supports custom aria-label', () => {
      render(<Progress value={50} aria-label="Upload progress" />);

      const progress = screen.getByRole('progressbar', { name: 'Upload progress' });
      expect(progress).toBeInTheDocument();
    });
  });

  describe('visual representation', () => {
    it('progress bar has correct class', () => {
      render(<Progress value={50} />);

      const progress = screen.getByRole('progressbar');
      const bar = progress.querySelector('.ui-progress-bar');
      expect(bar).toBeInTheDocument();
    });

    it('progress bar width matches value', () => {
      render(<Progress value={75} />);

      const progress = screen.getByRole('progressbar');
      const bar = progress.querySelector('.ui-progress-bar');
      expect(bar).toHaveStyle('width: 75%');
    });

    it('progress bar width updates on value change', () => {
      const { rerender } = render(<Progress value={25} />);

      const progress = screen.getByRole('progressbar');
      const bar = progress.querySelector('.ui-progress-bar');
      expect(bar).toHaveStyle('width: 25%');

      rerender(<Progress value={75} />);
      expect(bar).toHaveStyle('width: 75%');
    });
  });
});
