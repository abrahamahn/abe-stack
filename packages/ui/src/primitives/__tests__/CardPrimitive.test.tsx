// packages/ui/src/primitives/__tests__/CardPrimitive.test.tsx
/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { CardPrimitive } from '../CardPrimitive';

describe('CardPrimitive', () => {
  it('renders root with sections and content', () => {
    render(
      <CardPrimitive.Root>
        <CardPrimitive.Header>Header</CardPrimitive.Header>
        <CardPrimitive.Body>Body</CardPrimitive.Body>
        <CardPrimitive.Footer>Footer</CardPrimitive.Footer>
      </CardPrimitive.Root>,
    );

    expect(screen.getByText('Header')).toHaveClass('ui-card-header');
    expect(screen.getByText('Body')).toHaveClass('ui-card-body');
    expect(screen.getByText('Footer')).toHaveClass('ui-card-footer');
  });

  it('supports custom element and className on root', () => {
    const ref = { current: null };
    const { container } = render(
      <CardPrimitive.Root ref={ref} as="section" className="custom-card">
        Content
      </CardPrimitive.Root>,
    );

    const root = container.firstElementChild;
    expect(root?.tagName).toBe('SECTION');
    expect(root).toHaveClass('ui-card');
    expect(root).toHaveClass('custom-card');
    expect(ref.current).toBeInstanceOf(HTMLElement);
  });

  it('handles empty content gracefully', () => {
    expect(() => render(<CardPrimitive.Root />)).not.toThrow();
  });
});
