// src/client/ui/src/layouts/shells/TopbarLayout.tsx
import { forwardRef, type CSSProperties, type ReactNode } from 'react';
import '../../styles/layouts.css';

export type TopbarLayoutProps = {
  /** Content to display (fallback if left/center/right not used) */
  children?: ReactNode;
  /** Left section content (e.g., logo, back button) */
  left?: ReactNode;
  /** Center section content (e.g., title) */
  center?: ReactNode;
  /** Right section content (e.g., actions) */
  right?: ReactNode;
  /** Height of the bar @default '3rem' */
  height?: string | number;
  /** Whether to show a bottom border @default true */
  bordered?: boolean;
  /** Additional CSS class */
  className?: string;
  /** Additional inline styles */
  style?: CSSProperties;
};

/**
 * A top navigation bar component with left/center/right sections.
 * Use as the header slot in AppShell or standalone.
 *
 * @example
 * ```tsx
 * <TopbarLayout
 *   left={<Button>← Back</Button>}
 *   center={<Heading>App Title</Heading>}
 *   right={<Button>Settings</Button>}
 *   bordered
 * />
 * ```
 */
export const TopbarLayout = forwardRef<HTMLDivElement, TopbarLayoutProps>(
  (
    {
      children,
      left,
      center,
      right,
      height = '3rem',
      bordered = true,
      className = '',
      style,
      ...props
    },
    ref,
  ) => {
    const hasSlots = left !== undefined || center !== undefined || right !== undefined;

    const cssVars = {
      ['--topbar-height']: typeof height === 'number' ? `${String(height)}px` : height,
      ...style,
    } as CSSProperties;

    return (
      <header
        ref={ref}
        className={`topbar ${bordered ? 'topbar--bordered' : ''} ${className}`.trim()}
        style={cssVars}
        {...props}
      >
        {hasSlots ? (
          <>
            <div className="topbar-section topbar-section--left">{left}</div>
            <div className="topbar-section topbar-section--center">{center}</div>
            <div className="topbar-section topbar-section--right">{right}</div>
          </>
        ) : (
          children
        )}
      </header>
    );
  },
);

TopbarLayout.displayName = 'TopbarLayout';
