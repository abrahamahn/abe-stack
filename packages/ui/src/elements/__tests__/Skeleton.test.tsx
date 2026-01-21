// packages/ui/src/elements/__tests__/Skeleton.test.tsx
/** @vitest-environment jsdom */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Skeleton } from '../Skeleton';

describe('Skeleton', () => {
  it('renders with default dimensions (uses CSS defaults when no props)', () => {
    render(<Skeleton data-testid="skeleton" />);

    const skeleton = screen.getByTestId('skeleton');
    expect(skeleton).toHaveClass('skeleton');
    // Defaults are handled via CSS custom property fallbacks, no inline style set
    expect(skeleton.style.getPropertyValue('--skeleton-width')).toBe('');
    expect(skeleton.style.getPropertyValue('--skeleton-height')).toBe('');
    expect(skeleton.style.getPropertyValue('--skeleton-radius')).toBe('');
  });

  it('accepts numeric and string dimensions via CSS custom properties', () => {
    render(<Skeleton data-testid="skeleton" width={120} height="2rem" radius={4} />);

    const skeleton = screen.getByTestId('skeleton');
    expect(skeleton.style.getPropertyValue('--skeleton-width')).toBe('120px');
    expect(skeleton.style.getPropertyValue('--skeleton-height')).toBe('2rem');
    expect(skeleton.style.getPropertyValue('--skeleton-radius')).toBe('4px');
  });

  it('allows style overrides and merges className', () => {
    render(
      <Skeleton data-testid="skeleton" width="40%" className="custom" style={{ width: '50%' }} />,
    );

    const skeleton = screen.getByTestId('skeleton');
    // Style override takes precedence
    expect(skeleton).toHaveStyle('width: 50%');
    expect(skeleton).toHaveClass('skeleton');
    expect(skeleton).toHaveClass('custom');
  });

  it('forwards ref to div element', () => {
    const ref = { current: null };
    render(<Skeleton ref={ref} />);

    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });
});
