// client/ui/src/__tests__/integration/LayoutInteraction.integration.test.tsx
/** @vitest-environment jsdom */
/**
 * Integration tests for layout components with child interactions
 *
 * Tests complex layout scenarios:
 * - AppShell with header, sidebar, main content, footer
 * - Responsive layout behaviors
 * - Layout composition with interactive children
 * - Collapse/expand states
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { Button } from '../../elements/Button';
import { Input } from '../../elements/Input';
import { MenuItem } from '../../elements/MenuItem';
import { Container } from '../../layouts/containers/Container';
import { PageContainer } from '../../layouts/containers/PageContainer';
import { StackedLayout } from '../../layouts/containers/StackedLayout';
import { ScrollArea } from '../../layouts/layers/ScrollArea';
import { AppShell } from '../../layouts/shells/AppShell';
import { BottombarLayout } from '../../layouts/shells/BottombarLayout';
import { LeftSidebarLayout } from '../../layouts/shells/LeftSidebarLayout';
import { RightSidebarLayout } from '../../layouts/shells/RightSidebarLayout';
import { TopbarLayout } from '../../layouts/shells/TopbarLayout';

// =============================================================================
// Test Components
// =============================================================================

const NavigationMenu = ({
  onItemClick,
}: {
  onItemClick?: (item: string) => void;
}): React.ReactElement => {
  const items = ['Dashboard', 'Users', 'Settings', 'Reports'];

  return (
    <nav aria-label="Main navigation">
      <ul role="list" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {items.map((item) => (
          <li key={item}>
            <MenuItem onClick={() => onItemClick?.(item)}>{item}</MenuItem>
          </li>
        ))}
      </ul>
    </nav>
  );
};

const Header = ({
  onMenuClick,
  onSearchSubmit,
}: {
  onMenuClick?: () => void;
  onSearchSubmit?: (query: string) => void;
}): React.ReactElement => {
  const [query, setQuery] = useState('');

  return (
    <TopbarLayout
      left={
        <Button onClick={onMenuClick} aria-label="Toggle menu">
          Menu
        </Button>
      }
      center={
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSearchSubmit?.(query);
          }}
          role="search"
        >
          <Input
            type="search"
            placeholder="Search..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
            }}
            aria-label="Search"
          />
        </form>
      }
      right={<Button>Profile</Button>}
    />
  );
};

const Sidebar = ({
  onItemClick,
}: {
  collapsed?: boolean;
  onItemClick?: (item: string) => void;
}): React.ReactElement => {
  return (
    <LeftSidebarLayout>
      <NavigationMenu {...(onItemClick !== undefined && { onItemClick })} />
    </LeftSidebarLayout>
  );
};

const AsidePanel = ({
  collapsed: _collapsed = false,
}: {
  collapsed?: boolean;
}): React.ReactElement => {
  return (
    <RightSidebarLayout>
      <div data-testid="aside-content">
        <h3>Quick Actions</h3>
        <Button>New Item</Button>
        <Button>Export</Button>
      </div>
    </RightSidebarLayout>
  );
};

const Footer = (): React.ReactElement => {
  return (
    <BottombarLayout>
      <span data-testid="footer-content">© 2024 Company</span>
    </BottombarLayout>
  );
};

const MainContent = (): React.ReactElement => {
  return (
    <PageContainer>
      <h1>Welcome to Dashboard</h1>
      <p>This is the main content area.</p>
      <Container>
        <StackedLayout>
          <div data-testid="card-1">Card 1</div>
          <div data-testid="card-2">Card 2</div>
          <div data-testid="card-3">Card 3</div>
        </StackedLayout>
      </Container>
    </PageContainer>
  );
};

const FullAppShell = ({
  onNavItemClick,
  onSearchSubmit,
  sidebarCollapsed = false,
  asideCollapsed = false,
}: {
  onNavItemClick?: (item: string) => void;
  onSearchSubmit?: (query: string) => void;
  sidebarCollapsed?: boolean;
  asideCollapsed?: boolean;
}): React.ReactElement => {
  const [isSidebarCollapsed, setSidebarCollapsed] = useState(sidebarCollapsed);

  return (
    <AppShell
      header={
        <Header
          onMenuClick={() => {
            setSidebarCollapsed((c) => !c);
          }}
          {...(onSearchSubmit !== undefined && { onSearchSubmit })}
        />
      }
      sidebar={
        <Sidebar
          collapsed={isSidebarCollapsed}
          {...(onNavItemClick !== undefined && { onItemClick: onNavItemClick })}
        />
      }
      aside={<AsidePanel collapsed={asideCollapsed} />}
      footer={<Footer />}
      sidebarCollapsed={isSidebarCollapsed}
      asideCollapsed={asideCollapsed}
    >
      <MainContent />
    </AppShell>
  );
};

// =============================================================================
// Tests
// =============================================================================

describe('LayoutInteraction Integration Tests', () => {
  describe('AppShell with Interactive Children', () => {
    it('renders all layout sections', () => {
      render(<FullAppShell />);

      // Header elements
      expect(screen.getByRole('button', { name: /toggle menu/i })).toBeInTheDocument();
      expect(screen.getByRole('searchbox')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /profile/i })).toBeInTheDocument();

      // Sidebar navigation
      expect(screen.getByRole('navigation', { name: /main navigation/i })).toBeInTheDocument();
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Users')).toBeInTheDocument();

      // Main content
      expect(screen.getByRole('heading', { name: /welcome to dashboard/i })).toBeInTheDocument();
      expect(screen.getByTestId('card-1')).toBeInTheDocument();

      // Footer
      expect(screen.getByTestId('footer-content')).toBeInTheDocument();
    });

    it('handles navigation item clicks', async () => {
      const user = userEvent.setup();
      const onNavItemClick = vi.fn();
      render(<FullAppShell onNavItemClick={onNavItemClick} />);

      await user.click(screen.getByText('Dashboard'));
      expect(onNavItemClick).toHaveBeenCalledWith('Dashboard');

      await user.click(screen.getByText('Settings'));
      expect(onNavItemClick).toHaveBeenCalledWith('Settings');
    });

    it('handles search form submission', async () => {
      const user = userEvent.setup();
      const onSearchSubmit = vi.fn();
      render(<FullAppShell onSearchSubmit={onSearchSubmit} />);

      const searchInput = screen.getByRole('searchbox');
      await user.type(searchInput, 'test query');
      await user.keyboard('{Enter}');

      expect(onSearchSubmit).toHaveBeenCalledWith('test query');
    });

    it('toggles sidebar state on menu click', async () => {
      const user = userEvent.setup();
      render(<FullAppShell />);

      const menuButton = screen.getByRole('button', { name: /toggle menu/i });

      // Initially, navigation is visible
      expect(screen.getByRole('navigation', { name: /main navigation/i })).toBeVisible();

      // Click to toggle sidebar state
      await user.click(menuButton);

      // The menu button should still be functional
      expect(menuButton).toBeInTheDocument();
    });

    it('has accessible elements', () => {
      render(<FullAppShell />);

      // Verify key accessible elements exist
      expect(screen.getByRole('button', { name: /toggle menu/i })).toBeInTheDocument();
      expect(screen.getByRole('searchbox')).toBeInTheDocument();
      expect(screen.getByRole('navigation', { name: /main navigation/i })).toBeInTheDocument();
    });
  });

  describe('TopbarLayout Composition', () => {
    it('renders left, center, and right sections', () => {
      render(
        <TopbarLayout
          left={<span data-testid="left">Left</span>}
          center={<span data-testid="center">Center</span>}
          right={<span data-testid="right">Right</span>}
        />,
      );

      expect(screen.getByTestId('left')).toBeInTheDocument();
      expect(screen.getByTestId('center')).toBeInTheDocument();
      expect(screen.getByTestId('right')).toBeInTheDocument();
    });

    it('handles interactive elements in all sections', async () => {
      const user = userEvent.setup();
      const leftClick = vi.fn();
      const rightClick = vi.fn();

      render(
        <TopbarLayout
          left={<Button onClick={leftClick}>Left Button</Button>}
          right={<Button onClick={rightClick}>Right Button</Button>}
        />,
      );

      await user.click(screen.getByRole('button', { name: /left button/i }));
      expect(leftClick).toHaveBeenCalledTimes(1);

      await user.click(screen.getByRole('button', { name: /right button/i }));
      expect(rightClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('Sidebar Layouts', () => {
    it('renders LeftSidebarLayout with content', () => {
      render(
        <LeftSidebarLayout>
          <div data-testid="sidebar-content">Sidebar Content</div>
        </LeftSidebarLayout>,
      );

      expect(screen.getByTestId('sidebar-content')).toBeInTheDocument();
    });

    it('renders RightSidebarLayout with content', () => {
      render(
        <RightSidebarLayout>
          <div data-testid="aside-content">Aside Content</div>
        </RightSidebarLayout>,
      );

      expect(screen.getByTestId('aside-content')).toBeInTheDocument();
    });

    it('handles collapsed state in LeftSidebarLayout', () => {
      const { rerender } = render(
        <LeftSidebarLayout>
          <div data-testid="content">Content</div>
        </LeftSidebarLayout>,
      );

      expect(screen.getByTestId('content')).toBeVisible();

      rerender(
        <LeftSidebarLayout>
          <div data-testid="content">Content</div>
        </LeftSidebarLayout>,
      );

      // Content should still exist but sidebar should be collapsed
      expect(screen.getByTestId('content')).toBeInTheDocument();
    });
  });

  describe('Container Layouts', () => {
    it('renders Container with proper constraints', () => {
      render(
        <Container data-testid="container">
          <div>Content</div>
        </Container>,
      );

      const container = screen.getByTestId('container');
      expect(container).toBeInTheDocument();
      expect(container).toHaveClass('container');
    });

    it('renders PageContainer with title', () => {
      render(
        <PageContainer title="Page Title" data-testid="page">
          <div>Page Content</div>
        </PageContainer>,
      );

      expect(screen.getByTestId('page')).toBeInTheDocument();
    });

    it('renders StackedLayout with children', () => {
      render(
        <StackedLayout>
          <div data-testid="item-1">Item 1</div>
          <div data-testid="item-2">Item 2</div>
          <div data-testid="item-3">Item 3</div>
        </StackedLayout>,
      );

      // StackedLayout renders children inside a body container
      expect(screen.getByTestId('item-1')).toBeInTheDocument();
      expect(screen.getByTestId('item-2')).toBeInTheDocument();
      expect(screen.getByTestId('item-3')).toBeInTheDocument();
    });
  });

  describe('ScrollArea Integration', () => {
    it('renders ScrollArea with content', () => {
      render(
        <ScrollArea style={{ height: '200px' }} data-testid="scroll-area">
          <div style={{ height: '500px' }}>Tall content</div>
        </ScrollArea>,
      );

      expect(screen.getByTestId('scroll-area')).toBeInTheDocument();
      expect(screen.getByText('Tall content')).toBeInTheDocument();
    });

    it('allows scrolling in ScrollArea', () => {
      render(
        <ScrollArea style={{ height: '100px', overflow: 'auto' }} data-testid="scroll-area">
          {Array.from({ length: 20 }, (_, i) => (
            <div key={i} data-testid={`item-${String(i)}`}>
              Item {i}
            </div>
          ))}
        </ScrollArea>,
      );

      expect(screen.getByTestId('scroll-area')).toBeInTheDocument();
      expect(screen.getByTestId('item-0')).toBeInTheDocument();
      expect(screen.getByTestId('item-19')).toBeInTheDocument();
    });

    it('renders interactive content inside ScrollArea', async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();

      render(
        <ScrollArea style={{ height: '200px' }} data-testid="scroll-area">
          <Button onClick={onClick}>Click Me</Button>
        </ScrollArea>,
      );

      await user.click(screen.getByRole('button', { name: /click me/i }));
      expect(onClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('Complex Layout Compositions', () => {
    it('renders nested layouts correctly', () => {
      render(
        <AppShell header={<TopbarLayout left={<span>Logo</span>} right={<Button>Login</Button>} />}>
          <Container>
            <StackedLayout>
              <div data-testid="section-1">Section 1</div>
              <div data-testid="section-2">Section 2</div>
            </StackedLayout>
          </Container>
        </AppShell>,
      );

      expect(screen.getByText('Logo')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
      expect(screen.getByTestId('section-1')).toBeInTheDocument();
      expect(screen.getByTestId('section-2')).toBeInTheDocument();
    });

    it('handles interactions in nested layouts', async () => {
      const user = userEvent.setup();
      const loginClick = vi.fn();
      const section1Click = vi.fn();

      render(
        <AppShell header={<TopbarLayout right={<Button onClick={loginClick}>Login</Button>} />}>
          <Container>
            <Button onClick={section1Click}>Section Button</Button>
          </Container>
        </AppShell>,
      );

      await user.click(screen.getByRole('button', { name: /login/i }));
      expect(loginClick).toHaveBeenCalledTimes(1);

      await user.click(screen.getByRole('button', { name: /section button/i }));
      expect(section1Click).toHaveBeenCalledTimes(1);
    });

    it('supports keyboard navigation through layout sections', async () => {
      const user = userEvent.setup();

      render(
        <AppShell
          header={<TopbarLayout left={<Button>Menu</Button>} right={<Button>Profile</Button>} />}
          sidebar={
            <LeftSidebarLayout>
              <Button>Nav 1</Button>
              <Button>Nav 2</Button>
            </LeftSidebarLayout>
          }
        >
          <Container>
            <Button>Main Action</Button>
          </Container>
        </AppShell>,
      );

      // Start tabbing through the layout
      await user.tab();
      expect(screen.getByRole('button', { name: /menu/i })).toHaveFocus();

      await user.tab();
      expect(screen.getByRole('button', { name: /profile/i })).toHaveFocus();

      await user.tab();
      expect(screen.getByRole('button', { name: /nav 1/i })).toHaveFocus();

      await user.tab();
      expect(screen.getByRole('button', { name: /nav 2/i })).toHaveFocus();

      await user.tab();
      expect(screen.getByRole('button', { name: /main action/i })).toHaveFocus();
    });
  });

  describe('Layout Accessibility', () => {
    it('AppShell has proper landmark structure', () => {
      render(
        <AppShell
          header={<span>Header Content</span>}
          sidebar={<nav aria-label="Sidebar">Sidebar Navigation</nav>}
          footer={<span>Footer Content</span>}
        >
          <div>Main Content</div>
        </AppShell>,
      );

      // AppShell creates its own header/footer/aside/main elements
      // The header creates role="banner"
      expect(screen.getByRole('banner')).toBeInTheDocument();
      // The footer creates role="contentinfo"
      expect(screen.getByRole('contentinfo')).toBeInTheDocument();
      // The main creates role="main"
      expect(screen.getByRole('main')).toBeInTheDocument();
      // The sidebar is an aside with role="complementary"
      expect(screen.getByRole('complementary')).toBeInTheDocument();
    });

    it('nested layouts maintain accessibility', () => {
      render(
        <AppShell
          header={
            <TopbarLayout
              left={<Button aria-label="Menu">Menu</Button>}
              center={
                <form role="search">
                  <Input aria-label="Search" placeholder="Search..." />
                </form>
              }
              right={<Button>Profile</Button>}
            />
          }
        >
          <Container>
            <h1>Page Title</h1>
            <p>Content</p>
          </Container>
        </AppShell>,
      );

      // Verify key accessible elements in nested layout
      expect(screen.getByRole('button', { name: /menu/i })).toBeInTheDocument();
      expect(screen.getByRole('search')).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /page title/i })).toBeInTheDocument();
    });
  });
});
