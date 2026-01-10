// packages/ui/src/elements/__tests__/CardElement.test.tsx
/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { CardElement } from '../CardElement';

describe('CardElement', () => {
  it('renders root with sections and content', () => {
    render(
      <CardElement.Root>
        <CardElement.Header>Header</CardElement.Header>
        <CardElement.Body>Body</CardElement.Body>
        <CardElement.Footer>Footer</CardElement.Footer>
      </CardElement.Root>,
    );

    expect(screen.getByText('Header')).toHaveClass('ui-card-header');
    expect(screen.getByText('Body')).toHaveClass('ui-card-body');
    expect(screen.getByText('Footer')).toHaveClass('ui-card-footer');
  });

  it('supports custom element and className on root', () => {
    const ref = { current: null };
    const { container } = render(
      <CardElement.Root ref={ref} as="section" className="custom-card">
        Content
      </CardElement.Root>,
    );

    const root = container.firstElementChild;
    expect(root?.tagName).toBe('SECTION');
    expect(root).toHaveClass('ui-card');
    expect(root).toHaveClass('custom-card');
    expect(ref.current).toBeInstanceOf(HTMLElement);
  });

  it('handles empty content gracefully', () => {
    expect(() => render(<CardElement.Root />)).not.toThrow();
  });
});
