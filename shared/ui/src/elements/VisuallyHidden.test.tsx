// shared/ui/src/elements/VisuallyHidden.test.tsx
/** @vitest-environment jsdom */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { VisuallyHidden } from './VisuallyHidden';

describe('VisuallyHidden', () => {
  it('renders a span with visually-hidden class', () => {
    render(<VisuallyHidden>Hidden text</VisuallyHidden>);

    const span = screen.getByText('Hidden text');
    expect(span.tagName).toBe('SPAN');
    expect(span).toHaveClass('visually-hidden');
  });

  it('merges custom className with base class', () => {
    render(<VisuallyHidden className="custom">Content</VisuallyHidden>);

    const span = screen.getByText('Content');
    expect(span).toHaveClass('visually-hidden');
    expect(span).toHaveClass('custom');
  });

  it('forwards ref to span element', () => {
    const ref = { current: null };
    render(<VisuallyHidden ref={ref}>Text</VisuallyHidden>);

    expect(ref.current).toBeInstanceOf(HTMLSpanElement);
  });
});
