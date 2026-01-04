import { forwardRef, type CSSProperties, type ReactNode } from 'react';
import '../../styles/layouts.css';

export type LeftSidebarLayoutProps = {
  /** Main content (fallback if header/content/footer not used) */
  children?: ReactNode;
  /** Header section content (e.g., navigation icons) */
  header?: ReactNode;
  /** Main scrollable content */
  content?: ReactNode;
  /** Footer section content (e.g., settings, toggles) - pushed to bottom */
  footer?: ReactNode;
  /** Width of the sidebar @default '3.125rem' */
  width?: string | number;
  /** Whether to show a right border @default true */
  bordered?: boolean;
  /** Additional CSS class */
  className?: string;
  /** Additional inline styles */
  style?: CSSProperties;
};

/**
 * A left sidebar component with header/content/footer sections.
 * Footer content is pushed to the bottom using flexbox spacer pattern.
 * Use as the sidebar slot in AppShell or standalone.
 *
 * @example
 * ```tsx
 * <LeftSidebarLayout
 *   header={<NavigationIcons />}
 *   content={<MenuItems />}
 *   footer={<SettingsButton />}
 *   bordered
 * />
 * ```
 */
export const LeftSidebarLayout = forwardRef<HTMLDivElement, LeftSidebarLayoutProps>(
  (
    {
      children,
      header,
      content,
      footer,
      width = '3.125rem',
      bordered = true,
      className = '',
      style,
      ...props
    },
    ref,
  ) => {
    const hasSlots = header !== undefined || content !== undefined || footer !== undefined;

    const cssVars = {
      '--left-sidebar-width': typeof width === 'number' ? `${String(width)}px` : width,
      ...style,
    } as CSSProperties;

    return (
      <aside
        ref={ref}
        className={`left-sidebar ${bordered ? 'left-sidebar--bordered' : ''} ${className}`.trim()}
        style={cssVars}
        {...props}
      >
        {hasSlots ? (
          <>
            {header && <div className="left-sidebar-header">{header}</div>}
            {content && <div className="left-sidebar-content">{content}</div>}
            {footer && <div className="left-sidebar-footer">{footer}</div>}
          </>
        ) : (
          children
        )}
      </aside>
    );
  },
);

LeftSidebarLayout.displayName = 'LeftSidebarLayout';
