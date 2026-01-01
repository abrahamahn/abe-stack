/** @vitest-environment jsdom */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AppShell } from '../AppShell';

describe('AppShell', () => {
  it('renders layout parts correctly', () => {
    render(
      <AppShell
        header={<div>Header Content</div>}
        sidebar={<div>Sidebar Content</div>}
        footer={<div>Footer Content</div>}
      >
        <div>Main Content</div>
      </AppShell>,
    );

    expect(screen.getByText('Header Content')).toBeInTheDocument();
    expect(screen.getByText('Sidebar Content')).toBeInTheDocument();
    expect(screen.getByText('Footer Content')).toBeInTheDocument();
    expect(screen.getByText('Main Content')).toBeInTheDocument();
  });

  it('renders main content even without optional slots', () => {
    render(<AppShell>Body</AppShell>);

    expect(screen.getByText('Body')).toBeInTheDocument();
    expect(screen.queryByRole('banner')).not.toBeInTheDocument();
    expect(screen.queryByRole('contentinfo')).not.toBeInTheDocument();
  });

  it('forwards className, style, and ref to root', () => {
    const ref = { current: null };
    const { container } = render(
      <AppShell ref={ref} className="custom-shell" style={{ margin: '12px' }}>
        Main
      </AppShell>,
    );

    expect(container.firstChild).toHaveClass('ui-app-shell');
    expect(container.firstChild).toHaveClass('custom-shell');
    expect(container.firstChild).toHaveStyle({ margin: '12px' });
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it('hides sidebar when sidebarCollapsed is true', () => {
    render(
      <AppShell sidebar={<div>Sidebar Content</div>} sidebarCollapsed={true}>
        Main
      </AppShell>,
    );
    expect(screen.queryByText('Sidebar Content')).not.toBeInTheDocument();
  });

  it('hides aside when asideCollapsed is true', () => {
    render(
      <AppShell aside={<div>Aside Content</div>} asideCollapsed={true}>
        Main
      </AppShell>,
    );
    expect(screen.queryByText('Aside Content')).not.toBeInTheDocument();
  });

  it('applies style variables', () => {
    const { container } = render(
      <AppShell headerHeight={100} sidebarWidth={300}>
        Main
      </AppShell>,
    );

    // Note: styles applied to the container
    expect(container.firstChild).toHaveStyle({
      '--ui-header-height': '100px',
      '--ui-sidebar-width': '300px',
    });
  });

  it('sets collapsed widths to 0px', () => {
    const { container } = render(
      <AppShell
        sidebar={<div>Sidebar</div>}
        aside={<div>Aside</div>}
        sidebarCollapsed
        asideCollapsed
      >
        Main
      </AppShell>,
    );

    expect(container.firstChild).toHaveStyle({
      '--ui-sidebar-width': '0px',
      '--ui-aside-width': '0px',
    });
  });
});
