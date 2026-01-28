// packages/ui/src/layouts/containers/Container.test.tsx
/** @vitest-environment jsdom */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Container } from './Container';

describe('Container', () => {
  it('renders with default size and className', () => {
    render(<Container data-testid="container">Content</Container>);

    const container = screen.getByTestId('container');
    expect(container).toHaveClass('container');
    expect(container).toHaveClass('container--md');
  });

  it('supports size variants', () => {
    const { rerender } = render(<Container size="sm">Small</Container>);
    expect(screen.getByText('Small')).toHaveClass('container--sm');

    rerender(<Container size="lg">Large</Container>);
    expect(screen.getByText('Large')).toHaveClass('container--lg');
  });

  it('forwards className and style overrides', () => {
    render(
      <Container className="custom-container" style={{ maxWidth: '500px' }}>
        Custom
      </Container>,
    );

    const container = screen.getByText('Custom');
    expect(container).toHaveClass('custom-container');
    expect(container).toHaveStyle('max-width: 500px');
  });

  it('handles invalid size without crashing', () => {
    expect(() => {
      render(
        // @ts-expect-error testing invalid size
        <Container size="xl">Invalid</Container>,
      );
    }).not.toThrow();
  });
});
