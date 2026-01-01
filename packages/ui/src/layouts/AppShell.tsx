import { forwardRef, type CSSProperties, type ReactNode } from 'react';
import '../styles/layouts.css';

export interface AppShellProps {
  /**
   * Header content
   */
  header?: ReactNode;
  /**
   * Sidebar content (left)
   */
  sidebar?: ReactNode;
  /**
   * Aside content (right)
   */
  aside?: ReactNode;
  /**
   * Footer content
   */
  footer?: ReactNode;
  /**
   * Main content
   */
  children: ReactNode;
  /**
   * Height of the header
   * @default '64px'
   */
  headerHeight?: string | number;
  /**
   * Height of the footer
   * @default 'auto'
   */
  footerHeight?: string | number;
  /**
   * Width of the sidebar
   * @default '250px'
   */
  sidebarWidth?: string | number;
  /**
   * Width of the aside panel
   * @default '250px'
   */
  asideWidth?: string | number;
  /**
   * Whether sidebar is collapsed (hidden)
   */
  sidebarCollapsed?: boolean;
  /**
   * Whether aside is collapsed (hidden)
   */
  asideCollapsed?: boolean;
  className?: string;
  style?: CSSProperties;
}

/**
 * A responsive app shell layout with header, footer, sidebar, and aside slots.
 * Uses CSS Grid for layout.
 */
export const AppShell = forwardRef<HTMLDivElement, AppShellProps>(
  (
    {
      header,
      sidebar,
      aside,
      footer,
      children,
      headerHeight = '64px',
      footerHeight = 'auto',
      sidebarWidth = '250px',
      asideWidth = '250px',
      sidebarCollapsed = false,
      asideCollapsed = false,
      className = '',
      style,
      ...props
    },
    ref,
  ) => {
    const cssVars = {
      '--ui-header-height':
        typeof headerHeight === 'number' ? `${String(headerHeight)}px` : headerHeight,
      '--ui-footer-height':
        typeof footerHeight === 'number' ? `${String(footerHeight)}px` : footerHeight,
      '--ui-sidebar-width': sidebarCollapsed
        ? '0px'
        : typeof sidebarWidth === 'number'
          ? `${String(sidebarWidth)}px`
          : sidebarWidth,
      '--ui-aside-width': asideCollapsed
        ? '0px'
        : typeof asideWidth === 'number'
          ? `${String(asideWidth)}px`
          : asideWidth,
      ...style,
    } as CSSProperties;

    return (
      <div ref={ref} className={`ui-app-shell ${className}`.trim()} style={cssVars} {...props}>
        {header && <header className="ui-app-shell-header">{header}</header>}
        {sidebar && !sidebarCollapsed && <aside className="ui-app-shell-sidebar">{sidebar}</aside>}
        <main className="ui-app-shell-main">{children}</main>
        {aside && !asideCollapsed && <aside className="ui-app-shell-aside">{aside}</aside>}
        {footer && <footer className="ui-app-shell-footer">{footer}</footer>}
      </div>
    );
  },
);

AppShell.displayName = 'AppShell';
