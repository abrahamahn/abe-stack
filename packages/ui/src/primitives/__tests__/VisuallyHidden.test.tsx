// packages/ui/src/primitives/__tests__/VisuallyHidden.test.tsx
/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { VisuallyHidden } from '../VisuallyHidden';

describe('VisuallyHidden', () => {
  it('renders a hidden span with class', () => {
    render(<VisuallyHidden>Hidden label</VisuallyHidden>);

    const hidden = screen.getByText('Hidden label');
    expect(hidden.tagName).toBe('SPAN');
    expect(hidden).toHaveClass('ui-visually-hidden');
  });

  it('forwards className and ref', () => {
    const ref = { current: null };
    render(
      <VisuallyHidden ref={ref} className="custom-hidden">
        Hidden
      </VisuallyHidden>,
    );

    const hidden = screen.getByText('Hidden');
    expect(hidden).toHaveClass('custom-hidden');
    expect(ref.current).toBeInstanceOf(HTMLSpanElement);
  });
});
