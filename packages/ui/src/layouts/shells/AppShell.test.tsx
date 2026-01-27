// packages/ui/src/layouts/shells/__tests__/AppShell.test.tsx
/** @vitest-environment jsdom */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AppShell } from './AppShell';

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
  });

  it('forwards className, style, and ref to root', () => {
    const ref = { current: null };
    const { container } = render(
      <AppShell ref={ref} className="custom-shell" style={{ margin: '12px' }}>
        Main
      </AppShell>,
    );

    expect(container.firstChild).toHaveClass('app-shell');
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

    expect(container.firstChild).toHaveStyle({
      ['--app-shell-header-height']: '100px',
      ['--app-shell-sidebar-width']: '300px',
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
      ['--app-shell-sidebar-width']: '0px',
      ['--app-shell-aside-width']: '0px',
    });
  });

  it('renders aside content when provided', () => {
    render(<AppShell aside={<div>Aside Content</div>}>Main</AppShell>);
    expect(screen.getByText('Aside Content')).toBeInTheDocument();
  });

  it('accepts string values for dimensions', () => {
    const { container } = render(
      <AppShell headerHeight="80px" footerHeight="60px" sidebarWidth="20rem" asideWidth="15rem">
        Main
      </AppShell>,
    );

    expect(container.firstChild).toHaveStyle({
      ['--app-shell-header-height']: '80px',
      ['--app-shell-footer-height']: '60px',
      ['--app-shell-sidebar-width']: '20rem',
      ['--app-shell-aside-width']: '15rem',
    });
  });

  it('uses semantic HTML elements for layout regions', () => {
    render(
      <AppShell
        header={<div>Header</div>}
        sidebar={<div>Sidebar</div>}
        aside={<div>Aside</div>}
        footer={<div>Footer</div>}
      >
        Main
      </AppShell>,
    );

    expect(document.querySelector('header.app-shell-header')).toBeInTheDocument();
    expect(document.querySelector('main.app-shell-main')).toBeInTheDocument();
    expect(document.querySelector('footer.app-shell-footer')).toBeInTheDocument();
    expect(document.querySelectorAll('aside')).toHaveLength(2);
  });

  it('applies default dimension values', () => {
    const { container } = render(<AppShell>Main</AppShell>);

    expect(container.firstChild).toHaveStyle({
      ['--app-shell-header-height']: '4rem',
      ['--app-shell-footer-height']: '3rem',
      ['--app-shell-sidebar-width']: '15rem',
      ['--app-shell-aside-width']: '15rem',
    });
  });

  describe('resizable mode', () => {
    it('renders with resizable sidebar', () => {
      const { container } = render(
        <AppShell sidebar={<div>Sidebar</div>} sidebarResizable>
          Main
        </AppShell>,
      );

      expect(screen.getByText('Sidebar')).toBeInTheDocument();
      expect(screen.getByText('Main')).toBeInTheDocument();
      expect(container.firstChild).toHaveClass('app-shell');
    });

    it('renders with resizable header', () => {
      const { container } = render(
        <AppShell header={<div>Header</div>} headerResizable>
          Main
        </AppShell>,
      );

      expect(screen.getByText('Header')).toBeInTheDocument();
      expect(screen.getByText('Main')).toBeInTheDocument();
      expect(container.firstChild).toHaveClass('app-shell--resizable');
    });

    it('renders with resizable footer', () => {
      render(
        <AppShell footer={<div>Footer</div>} footerResizable>
          Main
        </AppShell>,
      );

      expect(screen.getByText('Footer')).toBeInTheDocument();
      expect(screen.getByText('Main')).toBeInTheDocument();
    });

    it('renders with resizable aside', () => {
      render(
        <AppShell aside={<div>Aside</div>} asideResizable>
          Main
        </AppShell>,
      );

      expect(screen.getByText('Aside')).toBeInTheDocument();
      expect(screen.getByText('Main')).toBeInTheDocument();
    });

    it('supports both vertical and horizontal resizing', () => {
      const { container } = render(
        <AppShell
          header={<div>Header</div>}
          sidebar={<div>Sidebar</div>}
          aside={<div>Aside</div>}
          footer={<div>Footer</div>}
          headerResizable
          sidebarResizable
          asideResizable
          footerResizable
        >
          Main
        </AppShell>,
      );

      expect(screen.getByText('Header')).toBeInTheDocument();
      expect(screen.getByText('Sidebar')).toBeInTheDocument();
      expect(screen.getByText('Aside')).toBeInTheDocument();
      expect(screen.getByText('Footer')).toBeInTheDocument();
      expect(screen.getByText('Main')).toBeInTheDocument();
      expect(container.firstChild).toHaveClass('app-shell--resizable');
    });

    it('does not render collapsed panels in resizable mode', () => {
      render(
        <AppShell
          header={<div>Header</div>}
          sidebar={<div>Sidebar</div>}
          headerResizable
          sidebarResizable
          headerCollapsed
          sidebarCollapsed
        >
          Main
        </AppShell>,
      );

      expect(screen.queryByText('Header')).not.toBeInTheDocument();
      expect(screen.queryByText('Sidebar')).not.toBeInTheDocument();
      expect(screen.getByText('Main')).toBeInTheDocument();
    });

    it('only renders horizontal resizing without vertical', () => {
      render(
        <AppShell header={<div>Header</div>} sidebar={<div>Sidebar</div>} sidebarResizable>
          Main
        </AppShell>,
      );

      expect(screen.getByText('Header')).toBeInTheDocument();
      expect(screen.getByText('Sidebar')).toBeInTheDocument();
      expect(screen.getByText('Main')).toBeInTheDocument();
    });
  });
});
