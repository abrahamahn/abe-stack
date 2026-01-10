// packages/ui/src/layouts/__tests__/BottombarLayout.test.tsx
/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { BottombarLayout } from '../BottombarLayout';

describe('BottombarLayout', () => {
  it('renders footer and main content with semantic elements', () => {
    const { container } = render(
      <BottombarLayout footer={<div>Footer Content</div>}>
        <div>Main Content</div>
      </BottombarLayout>,
    );

    expect(screen.getByText('Footer Content')).toBeInTheDocument();
    expect(screen.getByText('Main Content')).toBeInTheDocument();
    expect(container.querySelector('footer')).toHaveClass('ui-bottombar-layout-footer');
    expect(container.querySelector('main')).toHaveClass('ui-bottombar-layout-main');
  });

  it('applies default and custom footer height', () => {
    const { container, rerender } = render(
      <BottombarLayout footer={<div>Footer</div>}>
        <div>Content</div>
      </BottombarLayout>,
    );

    expect(container.firstChild).toHaveStyle({ '--ui-footer-height': '64px' });

    rerender(
      <BottombarLayout footer={<div>Footer</div>} footerHeight={80}>
        <div>Content</div>
      </BottombarLayout>,
    );

    expect(container.firstChild).toHaveStyle({ '--ui-footer-height': '80px' });

    rerender(
      <BottombarLayout footer={<div>Footer</div>} footerHeight="4rem">
        <div>Content</div>
      </BottombarLayout>,
    );

    expect(container.firstChild).toHaveStyle({ '--ui-footer-height': '4rem' });
  });

  it('forwards ref, className, and data attributes', () => {
    const ref = { current: null };
    render(
      <BottombarLayout footer={<div>Footer</div>} ref={ref} className="custom" data-testid="layout">
        <div>Content</div>
      </BottombarLayout>,
    );

    const layout = screen.getByTestId('layout');
    expect(layout).toHaveClass('ui-bottombar-layout');
    expect(layout).toHaveClass('custom');
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });
});
