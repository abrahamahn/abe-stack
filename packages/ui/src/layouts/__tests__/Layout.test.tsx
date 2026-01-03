// packages/ui/src/components/__tests__/Layout.test.tsx
/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Layout } from '../Layout';

describe('Layout', () => {
  it('renders slots and content when provided', () => {
    render(
      <Layout
        top={<div>Top</div>}
        bottom={<div>Bottom</div>}
        left={<div>Left</div>}
        right={<div>Right</div>}
      >
        <div>Main</div>
      </Layout>,
    );

    expect(screen.getByText('Top')).toBeInTheDocument();
    expect(screen.getByText('Bottom')).toBeInTheDocument();
    expect(screen.getByText('Left')).toBeInTheDocument();
    expect(screen.getByText('Right')).toBeInTheDocument();
    expect(screen.getByText('Main')).toBeInTheDocument();
  });

  it('omits optional slots when not provided', () => {
    const { container } = render(<Layout>Body</Layout>);

    expect(container.querySelector('.ui-layout-header')).toBeNull();
    expect(container.querySelector('.ui-layout-footer')).toBeNull();
    expect(container.querySelector('.ui-layout-left')).toBeNull();
    expect(container.querySelector('.ui-layout-right')).toBeNull();
  });

  it('applies css variables for layout sizing', () => {
    const { container } = render(
      <Layout gap="24px" minLeftWidth="180px" minRightWidth="320px">
        Content
      </Layout>,
    );

    const root = container.firstElementChild;
    expect(root).toHaveStyle({
      '--ui-layout-gap': '24px',
      '--ui-layout-left-min-width': '180px',
      '--ui-layout-right-min-width': '320px',
    });
    expect(root).toHaveStyle({
      '--ui-layout-columns': 'minmax(0, 2fr)',
    });
  });

  it('sets columns when side slots exist', () => {
    const { container } = render(
      <Layout left={<div>Left</div>} right={<div>Right</div>}>
        Content
      </Layout>,
    );

    const root = container.firstElementChild;
    expect(root).toHaveStyle({
      '--ui-layout-columns': 'minmax(220px, 1fr) minmax(0, 2fr) minmax(260px, 1fr)',
    });
  });

  it('sets top and bottom rows when header/footer exist', () => {
    const { container } = render(
      <Layout top={<div>Top</div>} bottom={<div>Bottom</div>}>
        Content
      </Layout>,
    );

    const root = container.firstElementChild;
    expect(root).toHaveStyle({
      '--ui-layout-top-row': 'auto',
      '--ui-layout-bottom-row': 'auto',
    });
  });

  it('forwards className and style', () => {
    const { container } = render(
      <Layout className="custom-layout" style={{ marginTop: '12px' }}>
        Content
      </Layout>,
    );

    const root = container.firstElementChild;
    expect(root).toHaveClass('custom-layout');
    expect(root).toHaveStyle({ marginTop: '12px' });
  });
});
