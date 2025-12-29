// packages/ui/src/primitives/__tests__/Progress.test.tsx
/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Progress } from '../Progress';

describe('Progress', () => {
  it('clamps values within 0-100', () => {
    const { rerender } = render(<Progress value={120} />);

    const progress = screen.getByRole('progressbar');
    expect(progress).toHaveAttribute('aria-valuenow', '100');

    const bar = progress.querySelector('.ui-progress-bar');
    expect(bar).toHaveStyle('width: 100%');

    rerender(<Progress value={-10} />);
    expect(progress).toHaveAttribute('aria-valuenow', '0');
  });
});
