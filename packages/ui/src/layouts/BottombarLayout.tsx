import { forwardRef, type ComponentPropsWithoutRef, type ReactNode } from 'react';
import '../styles/layouts.css';

export interface BottombarLayoutProps extends ComponentPropsWithoutRef<'div'> {
  /**
   * Bottom navigation bar content
   */
  footer: ReactNode;
  /**
   * Main content
   */
  children?: ReactNode;
  /**
   * Height of the footer
   * @default '64px'
   */
  footerHeight?: string | number;
}

/**
 * Layout with a fixed bottom navigation bar and scrollable content.
 */
export const BottombarLayout = forwardRef<HTMLDivElement, BottombarLayoutProps>(
  ({ footer, children, footerHeight = '64px', className = '', style, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`ui-bottombar-layout ${className}`.trim()}
        style={
          {
            '--ui-footer-height':
              typeof footerHeight === 'number' ? `${String(footerHeight)}px` : footerHeight,
            ...style,
          } as React.CSSProperties
        }
        {...props}
      >
        <main className="ui-bottombar-layout-main">{children}</main>
        <footer className="ui-bottombar-layout-footer">{footer}</footer>
      </div>
    );
  },
);

BottombarLayout.displayName = 'BottombarLayout';
