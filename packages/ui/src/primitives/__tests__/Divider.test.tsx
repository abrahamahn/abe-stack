// packages/ui/src/primitives/__tests__/Divider.test.tsx
/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Divider } from '../Divider';

describe('Divider', () => {
  it('renders an hr with separator role', () => {
    render(<Divider />);

    const divider = screen.getByRole('separator');
    expect(divider.tagName).toBe('HR');
    expect(divider).toHaveClass('ui-divider');
  });

  it('forwards className, ref, and attributes', () => {
    const ref = { current: null };
    render(<Divider ref={ref} className="custom-divider" data-testid="divider" />);

    const divider = screen.getByTestId('divider');
    expect(divider).toHaveClass('custom-divider');
    expect(ref.current).toBeInstanceOf(HTMLHRElement);
  });
});
