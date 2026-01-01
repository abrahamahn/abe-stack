import { forwardRef, type ComponentPropsWithoutRef, type ReactNode } from 'react';
import '../styles/layouts.css';

export interface TopbarLayoutProps extends ComponentPropsWithoutRef<'div'> {
  /**
   * Top navigation bar content
   */
  header: ReactNode;
  /**
   * Main content
   */
  children?: ReactNode;
  /**
   * Height of the header
   * @default '64px'
   */
  headerHeight?: string | number;
}

/**
 * Layout with a fixed top navigation bar and scrollable content.
 */
export const TopbarLayout = forwardRef<HTMLDivElement, TopbarLayoutProps>(
  ({ header, children, headerHeight = '64px', className = '', style, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`ui-topbar-layout ${className}`.trim()}
        style={
          {
            '--ui-header-height':
              typeof headerHeight === 'number' ? `${String(headerHeight)}px` : headerHeight,
            ...style,
          } as React.CSSProperties
        }
        {...props}
      >
        <header className="ui-topbar-layout-header">{header}</header>
        <main className="ui-topbar-layout-main">{children}</main>
      </div>
    );
  },
);

TopbarLayout.displayName = 'TopbarLayout';
