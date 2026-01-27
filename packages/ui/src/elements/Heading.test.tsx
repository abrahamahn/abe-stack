// packages/ui/src/elements/__tests__/Heading.test.tsx
/** @vitest-environment jsdom */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Heading } from './Heading';

describe('Heading', () => {
  it('renders default heading with size', () => {
    render(<Heading>Title</Heading>);

    const heading = screen.getByRole('heading', { name: 'Title' });
    expect(heading.tagName).toBe('H2');
    expect(heading).toHaveAttribute('data-size', 'lg');
    expect(heading).toHaveClass('heading');
  });

  it('supports custom element and size', () => {
    render(
      <Heading as="h1" size="xl">
        Big
      </Heading>,
    );

    const heading = screen.getByRole('heading', { name: 'Big' });
    expect(heading.tagName).toBe('H1');
    expect(heading).toHaveAttribute('data-size', 'xl');
  });

  it('forwards className and ref', () => {
    const ref = { current: null };
    render(
      <Heading ref={ref} className="custom-heading">
        Styled
      </Heading>,
    );

    const heading = screen.getByRole('heading', { name: 'Styled' });
    expect(heading).toHaveClass('custom-heading');
    expect(ref.current).toBeInstanceOf(HTMLElement);
  });
});
