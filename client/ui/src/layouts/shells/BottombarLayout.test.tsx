// client/ui/src/layouts/shells/BottombarLayout.test.tsx
/** @vitest-environment jsdom */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { BottombarLayout } from './BottombarLayout';

describe('BottombarLayout', () => {
  it('renders left/center/right sections when provided', () => {
    render(
      <BottombarLayout
        left={<div>Left Content</div>}
        center={<div>Center Content</div>}
        right={<div>Right Content</div>}
        data-testid="bottombar"
      />,
    );

    expect(screen.getByText('Left Content')).toBeInTheDocument();
    expect(screen.getByText('Center Content')).toBeInTheDocument();
    expect(screen.getByText('Right Content')).toBeInTheDocument();
    expect(screen.getByTestId('bottombar')).toHaveClass('bottombar');
  });

  it('renders children as fallback when slots not provided', () => {
    render(
      <BottombarLayout data-testid="bottombar">
        <div>Fallback Content</div>
      </BottombarLayout>,
    );

    expect(screen.getByText('Fallback Content')).toBeInTheDocument();
  });

  it('applies bordered class by default', () => {
    render(<BottombarLayout data-testid="bottombar">Content</BottombarLayout>);

    expect(screen.getByTestId('bottombar')).toHaveClass('bottombar--bordered');
  });

  it('removes bordered class when bordered={false}', () => {
    render(
      <BottombarLayout data-testid="bottombar" bordered={false}>
        Content
      </BottombarLayout>,
    );

    expect(screen.getByTestId('bottombar')).not.toHaveClass('bottombar--bordered');
  });

  it('applies default and custom height', () => {
    const { container, rerender } = render(<BottombarLayout>Content</BottombarLayout>);

    expect(container.firstChild).toHaveStyle({ ['--bottombar-height']: '2.5rem' });

    rerender(<BottombarLayout height={80}>Content</BottombarLayout>);
    expect(container.firstChild).toHaveStyle({ ['--bottombar-height']: '80px' });

    rerender(<BottombarLayout height="3rem">Content</BottombarLayout>);
    expect(container.firstChild).toHaveStyle({ ['--bottombar-height']: '3rem' });
  });

  it('forwards ref, className, and data attributes', () => {
    const ref = { current: null };
    render(
      <BottombarLayout ref={ref} className="custom" data-testid="bottombar">
        Content
      </BottombarLayout>,
    );

    const layout = screen.getByTestId('bottombar');
    expect(layout).toHaveClass('bottombar');
    expect(layout).toHaveClass('custom');
    expect(ref.current).toBeInstanceOf(HTMLElement);
  });

  it('renders as footer element', () => {
    const { container } = render(<BottombarLayout>Content</BottombarLayout>);

    expect(container.querySelector('footer')).toBeInTheDocument();
  });
});
