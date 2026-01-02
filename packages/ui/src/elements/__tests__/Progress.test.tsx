// packages/ui/src/elements/__tests__/Progress.test.tsx
/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Progress } from '../Progress';

describe('Progress', () => {
  it('renders progress bar with value and ARIA attributes', () => {
    render(<Progress value={50} />);

    const progress = screen.getByRole('progressbar');
    expect(progress).toHaveClass('ui-progress');
    expect(progress).toHaveAttribute('aria-valuenow', '50');
    expect(progress).toHaveAttribute('aria-valuemin', '0');
    expect(progress).toHaveAttribute('aria-valuemax', '100');
  });

  it('clamps value between 0 and 100', () => {
    const { rerender } = render(<Progress value={150} />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');

    rerender(<Progress value={-50} />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
  });

  it('handles NaN by defaulting to 0', () => {
    render(<Progress value={NaN} />);

    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
  });

  it('forwards ref and merges className', () => {
    const ref = { current: null };
    render(<Progress ref={ref} value={25} className="custom" />);

    const progress = screen.getByRole('progressbar');
    expect(progress).toHaveClass('ui-progress');
    expect(progress).toHaveClass('custom');
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });
});
