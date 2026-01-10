// packages/ui/src/layouts/__tests__/TopbarLayout.test.tsx
/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { TopbarLayout } from '../TopbarLayout';

describe('TopbarLayout', () => {
  it('renders header and main content with semantic elements', () => {
    const { container } = render(
      <TopbarLayout header={<div>Header Content</div>}>
        <div>Main Content</div>
      </TopbarLayout>,
    );

    expect(screen.getByText('Header Content')).toBeInTheDocument();
    expect(screen.getByText('Main Content')).toBeInTheDocument();
    expect(container.querySelector('header')).toHaveClass('ui-topbar-layout-header');
    expect(container.querySelector('main')).toHaveClass('ui-topbar-layout-main');
  });

  it('applies default and custom header height', () => {
    const { container, rerender } = render(
      <TopbarLayout header={<div>Header</div>}>
        <div>Content</div>
      </TopbarLayout>,
    );

    expect(container.firstChild).toHaveStyle({ '--ui-header-height': '64px' });

    rerender(
      <TopbarLayout header={<div>Header</div>} headerHeight={100}>
        <div>Content</div>
      </TopbarLayout>,
    );

    expect(container.firstChild).toHaveStyle({ '--ui-header-height': '100px' });

    rerender(
      <TopbarLayout header={<div>Header</div>} headerHeight="5rem">
        <div>Content</div>
      </TopbarLayout>,
    );

    expect(container.firstChild).toHaveStyle({ '--ui-header-height': '5rem' });
  });

  it('forwards ref, className, and data attributes', () => {
    const ref = { current: null };
    render(
      <TopbarLayout header={<div>Header</div>} ref={ref} className="custom" data-testid="layout">
        <div>Content</div>
      </TopbarLayout>,
    );

    const layout = screen.getByTestId('layout');
    expect(layout).toHaveClass('ui-topbar-layout');
    expect(layout).toHaveClass('custom');
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });
});
