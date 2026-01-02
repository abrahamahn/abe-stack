// packages/ui/src/elements/__tests__/Skeleton.test.tsx
/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Skeleton } from '../Skeleton';

describe('Skeleton', () => {
  it('renders with default dimensions', () => {
    render(<Skeleton data-testid="skeleton" />);

    const skeleton = screen.getByTestId('skeleton');
    expect(skeleton).toHaveClass('ui-skeleton');
    expect(skeleton).toHaveStyle('width: 100%');
    expect(skeleton).toHaveStyle('height: 16px');
    expect(skeleton).toHaveStyle('border-radius: 8px');
  });

  it('accepts numeric and string dimensions', () => {
    render(<Skeleton data-testid="skeleton" width={120} height="2rem" radius={4} />);

    const skeleton = screen.getByTestId('skeleton');
    expect(skeleton).toHaveStyle('width: 120px');
    expect(skeleton).toHaveStyle('height: 2rem');
    expect(skeleton).toHaveStyle('border-radius: 4px');
  });

  it('allows style overrides and merges className', () => {
    render(
      <Skeleton data-testid="skeleton" width="40%" className="custom" style={{ width: '50%' }} />,
    );

    const skeleton = screen.getByTestId('skeleton');
    expect(skeleton).toHaveStyle('width: 50%');
    expect(skeleton).toHaveClass('ui-skeleton');
    expect(skeleton).toHaveClass('custom');
  });

  it('forwards ref to div element', () => {
    const ref = { current: null };
    render(<Skeleton ref={ref} />);

    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });
});
