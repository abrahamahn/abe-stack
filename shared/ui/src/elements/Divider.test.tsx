// shared/ui/src/elements/Divider.test.tsx
/** @vitest-environment jsdom */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Divider } from './Divider';

describe('Divider', () => {
  it('renders an hr element with separator role', () => {
    render(<Divider />);

    const divider = screen.getByRole('separator');
    expect(divider.tagName).toBe('HR');
    expect(divider).toHaveClass('divider');
  });

  it('merges custom className with base class', () => {
    render(<Divider className="custom-divider" />);

    const divider = screen.getByRole('separator');
    expect(divider).toHaveClass('divider');
    expect(divider).toHaveClass('custom-divider');
  });

  it('forwards ref to hr element', () => {
    const ref = { current: null };
    render(<Divider ref={ref} />);

    expect(ref.current).toBeInstanceOf(HTMLHRElement);
  });
});
