// src/client/ui/src/layouts/shells/AppShell.tsx
import { ResizablePanel, ResizablePanelGroup } from '@shells/ResizablePanel';
import { forwardRef, type CSSProperties, type ReactNode } from 'react';

import '../../styles/layouts.css';

export type AppShellProps = {
  /** Header content - pass any ReactNode (e.g., TopbarLayout) */
  header?: ReactNode;
  /** Sidebar content (left) - pass any ReactNode (e.g., LeftSidebarLayout) */
  sidebar?: ReactNode;
  /** Aside content (right) - pass any ReactNode (e.g., RightSidebarLayout) */
  aside?: ReactNode;
  /** Footer content - pass any ReactNode (e.g., BottombarLayout) */
  footer?: ReactNode;
  /** Main content */
  children: ReactNode;

  // Size props
  /** Height of the header @default '4rem' */
  headerHeight?: string | number;
  /** Height of the footer @default 'auto' */
  footerHeight?: string | number;
  /** Width of the sidebar @default '15rem' */
  sidebarWidth?: string | number;
  /** Width of the aside panel @default '15rem' */
  asideWidth?: string | number;

  // Collapse props
  /** Whether header is collapsed */
  headerCollapsed?: boolean;
  /** Whether sidebar is collapsed */
  sidebarCollapsed?: boolean;
  /** Whether aside is collapsed */
  asideCollapsed?: boolean;
  /** Whether footer is collapsed */
  footerCollapsed?: boolean;

  // Resize props
  /** Whether header is resizable */
  headerResizable?: boolean;
  /** Whether sidebar is resizable */
  sidebarResizable?: boolean;
  /** Whether aside is resizable */
  asideResizable?: boolean;
  /** Whether footer is resizable */
  footerResizable?: boolean;

  // Resize constraints
  /** Minimum header size (percentage) */
  headerMinSize?: number;
  /** Maximum header size (percentage) */
  headerMaxSize?: number;
  /** Minimum sidebar size (percentage) */
  sidebarMinSize?: number;
  /** Maximum sidebar size (percentage) */
  sidebarMaxSize?: number;
  /** Minimum aside size (percentage) */
  asideMinSize?: number;
  /** Maximum aside size (percentage) */
  asideMaxSize?: number;
  /** Minimum footer size (percentage) */
  footerMinSize?: number;
  /** Maximum footer size (percentage) */
  footerMaxSize?: number;

  // Resize callbacks
  /** Callback when header is resized */
  onHeaderResize?: (size: number) => void;
  /** Callback when sidebar is resized */
  onSidebarResize?: (size: number) => void;
  /** Callback when aside is resized */
  onAsideResize?: (size: number) => void;
  /** Callback when footer is resized */
  onFooterResize?: (size: number) => void;

  /** Additional CSS class */
  className?: string;
  /** Additional inline styles */
  style?: CSSProperties;
};

/**
 * A responsive app shell layout with header, footer, sidebar, and aside slots.
 * Supports resizable panels and responsive breakpoints.
 *
 * AppShell is a pure container - it doesn't import other shells.
 * Users compose by passing ReactNode children (including TopbarLayout, LeftSidebarLayout, etc.)
 *
 * @example
 * ```tsx
 * <AppShell
 *   header={<TopbarLayout left={<Logo />} right={<Nav />} />}
 *   sidebar={<LeftSidebarLayout content={<Menu />} />}
 *   sidebarResizable
 *   onSidebarResize={(size) => console.log(size)}
 * >
 *   <MainContent />
 * </AppShell>
 * ```
 */
export const AppShell = forwardRef<HTMLDivElement, AppShellProps>(
  (
    {
      header,
      sidebar,
      aside,
      footer,
      children,
      // Sizes
      headerHeight = '4rem',
      footerHeight = '3rem',
      sidebarWidth = '15rem',
      asideWidth = '15rem',
      // Collapse
      headerCollapsed = false,
      sidebarCollapsed = false,
      asideCollapsed = false,
      footerCollapsed = false,
      // Resizable
      headerResizable = false,
      sidebarResizable = false,
      asideResizable = false,
      footerResizable = false,
      // Resize constraints
      headerMinSize = 4,
      headerMaxSize = 30,
      sidebarMinSize = 10,
      sidebarMaxSize = 40,
      asideMinSize = 10,
      asideMaxSize = 40,
      footerMinSize = 3,
      footerMaxSize = 20,
      // Callbacks
      onHeaderResize,
      onSidebarResize,
      onAsideResize,
      onFooterResize,
      className = '',
      style,
    },
    ref,
  ) => {
    const showHeader = header != null && !headerCollapsed;
    const showSidebar = sidebar != null && !sidebarCollapsed;
    const showAside = aside != null && !asideCollapsed;
    const showFooter = footer != null && !footerCollapsed;

    // Calculate default sizes for resizable panels
    const headerDefaultSize = typeof headerHeight === 'number' ? headerHeight / 10 : 6;
    const footerDefaultSize = typeof footerHeight === 'number' ? footerHeight / 10 : 5;
    const sidebarDefaultSize = typeof sidebarWidth === 'number' ? sidebarWidth / 10 : 20;
    const asideDefaultSize = typeof asideWidth === 'number' ? asideWidth / 10 : 20;

    // For non-resizable mode, use CSS variables
    const cssVars = {
      ['--app-shell-header-height']:
        typeof headerHeight === 'number' ? `${String(headerHeight)}px` : headerHeight,
      ['--app-shell-footer-height']:
        typeof footerHeight === 'number' ? `${String(footerHeight)}px` : footerHeight,
      ['--app-shell-sidebar-width']: sidebarCollapsed
        ? '0px'
        : typeof sidebarWidth === 'number'
          ? `${String(sidebarWidth)}px`
          : sidebarWidth,
      ['--app-shell-aside-width']: asideCollapsed
        ? '0px'
        : typeof asideWidth === 'number'
          ? `${String(asideWidth)}px`
          : asideWidth,
      ...style,
    } as CSSProperties;

    // Determine if any resizing is enabled
    const hasResizableVertical = headerResizable || footerResizable;
    const hasResizableHorizontal = sidebarResizable || asideResizable;

    // Simple non-resizable mode - use CSS Grid
    if (!hasResizableVertical && !hasResizableHorizontal) {
      return (
        <div ref={ref} className={`app-shell ${className}`.trim()} style={cssVars}>
          {showHeader && <header className="app-shell-header">{header}</header>}
          <div className="app-shell-body">
            {showSidebar && <aside className="app-shell-sidebar">{sidebar}</aside>}
            <main className="app-shell-main">{children}</main>
            {showAside && <aside className="app-shell-aside">{aside}</aside>}
          </div>
          {showFooter && <footer className="app-shell-footer">{footer}</footer>}
        </div>
      );
    }

    // Resizable mode - use ResizablePanelGroup
    const renderHorizontalContent = (): ReactNode => {
      if (!hasResizableHorizontal) {
        return (
          <div className="app-shell-body">
            {showSidebar && <aside className="app-shell-sidebar">{sidebar}</aside>}
            <main className="app-shell-main">{children}</main>
            {showAside && <aside className="app-shell-aside">{aside}</aside>}
          </div>
        );
      }

      return (
        <ResizablePanelGroup direction="horizontal" className="app-shell-body">
          {showSidebar && (
            <ResizablePanel
              defaultSize={sidebarDefaultSize}
              minSize={sidebarMinSize}
              maxSize={sidebarMaxSize}
              collapsed={sidebarCollapsed}
              direction="horizontal"
              onResize={onSidebarResize}
              className="app-shell-sidebar"
            >
              {sidebar}
            </ResizablePanel>
          )}
          <div className="app-shell-main">
            {children}
          </div>
          {showAside && (
            <ResizablePanel
              defaultSize={asideDefaultSize}
              minSize={asideMinSize}
              maxSize={asideMaxSize}
              collapsed={asideCollapsed}
              direction="horizontal"
              invertResize
              onResize={onAsideResize}
              className="app-shell-aside"
            >
              {aside}
            </ResizablePanel>
          )}
        </ResizablePanelGroup>
      );
    };

    // Vertical resizing wraps everything
    if (hasResizableVertical) {
      return (
        <ResizablePanelGroup
          ref={ref}
          direction="vertical"
          className={`app-shell app-shell--resizable ${className}`.trim()}
          style={cssVars}
        >
          {showHeader && (
            <ResizablePanel
              defaultSize={headerDefaultSize}
              minSize={headerMinSize}
              maxSize={headerMaxSize}
              collapsed={headerCollapsed}
              direction="vertical"
              onResize={onHeaderResize}
              className="app-shell-header"
            >
              {header}
            </ResizablePanel>
          )}
          <div className="app-shell-content">
            {renderHorizontalContent()}
          </div>
          {showFooter && (
            <ResizablePanel
              defaultSize={footerDefaultSize}
              minSize={footerMinSize}
              maxSize={footerMaxSize}
              collapsed={footerCollapsed}
              direction="vertical"
              invertResize
              onResize={onFooterResize}
              className="app-shell-footer"
            >
              {footer}
            </ResizablePanel>
          )}
        </ResizablePanelGroup>
      );
    }

    // Only horizontal resizing
    return (
      <div ref={ref} className={`app-shell ${className}`.trim()} style={cssVars}>
        {showHeader && <header className="app-shell-header">{header}</header>}
        {renderHorizontalContent()}
        {showFooter && <footer className="app-shell-footer">{footer}</footer>}
      </div>
    );
  },
);

AppShell.displayName = 'AppShell';
