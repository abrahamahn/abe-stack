// packages/ui/src/layouts/shells/TopbarLayout.test.tsx
/** @vitest-environment jsdom */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { TopbarLayout } from './TopbarLayout';

describe('TopbarLayout', () => {
  it('renders left/center/right sections when provided', () => {
    render(
      <TopbarLayout
        left={<div>Left Content</div>}
        center={<div>Center Content</div>}
        right={<div>Right Content</div>}
        data-testid="topbar"
      />,
    );

    expect(screen.getByText('Left Content')).toBeInTheDocument();
    expect(screen.getByText('Center Content')).toBeInTheDocument();
    expect(screen.getByText('Right Content')).toBeInTheDocument();
    expect(screen.getByTestId('topbar')).toHaveClass('topbar');
  });

  it('renders children as fallback when slots not provided', () => {
    render(
      <TopbarLayout data-testid="topbar">
        <div>Fallback Content</div>
      </TopbarLayout>,
    );

    expect(screen.getByText('Fallback Content')).toBeInTheDocument();
    expect(screen.queryByText('Left Content')).not.toBeInTheDocument();
  });

  it('applies bordered class by default', () => {
    render(<TopbarLayout data-testid="topbar">Content</TopbarLayout>);

    expect(screen.getByTestId('topbar')).toHaveClass('topbar--bordered');
  });

  it('removes bordered class when bordered={false}', () => {
    render(
      <TopbarLayout data-testid="topbar" bordered={false}>
        Content
      </TopbarLayout>,
    );

    expect(screen.getByTestId('topbar')).not.toHaveClass('topbar--bordered');
  });

  it('applies default and custom height', () => {
    const { container, rerender } = render(<TopbarLayout>Content</TopbarLayout>);

    expect(container.firstChild).toHaveStyle({ ['--topbar-height']: '3rem' });

    rerender(<TopbarLayout height={100}>Content</TopbarLayout>);
    expect(container.firstChild).toHaveStyle({ ['--topbar-height']: '100px' });

    rerender(<TopbarLayout height="5rem">Content</TopbarLayout>);
    expect(container.firstChild).toHaveStyle({ ['--topbar-height']: '5rem' });
  });

  it('forwards ref, className, and data attributes', () => {
    const ref = { current: null };
    render(
      <TopbarLayout ref={ref} className="custom" data-testid="topbar">
        Content
      </TopbarLayout>,
    );

    const layout = screen.getByTestId('topbar');
    expect(layout).toHaveClass('topbar');
    expect(layout).toHaveClass('custom');
    expect(ref.current).toBeInstanceOf(HTMLElement);
  });

  it('renders as header element', () => {
    const { container } = render(<TopbarLayout>Content</TopbarLayout>);

    expect(container.querySelector('header')).toBeInTheDocument();
  });
});
