import { forwardRef, type CSSProperties, type ReactNode } from 'react';
import '../../styles/layouts.css';

export type BottombarLayoutProps = {
  /** Content to display (fallback if left/center/right not used) */
  children?: ReactNode;
  /** Left section content (e.g., version info, status) */
  left?: ReactNode;
  /** Center section content (e.g., shortcuts, info) */
  center?: ReactNode;
  /** Right section content (e.g., actions, toggles) */
  right?: ReactNode;
  /** Height of the bar @default '2.5rem' */
  height?: string | number;
  /** Whether to show a top border @default true */
  bordered?: boolean;
  /** Additional CSS class */
  className?: string;
  /** Additional inline styles */
  style?: CSSProperties;
};

/**
 * A bottom status/action bar component with left/center/right sections.
 * Use as the footer slot in AppShell or standalone.
 *
 * @example
 * ```tsx
 * <BottombarLayout
 *   left={<VersionBadge version="1.0.0" />}
 *   center={<Text>Keyboard shortcuts</Text>}
 *   right={<ThemeToggle />}
 *   bordered
 * />
 * ```
 */
export const BottombarLayout = forwardRef<HTMLDivElement, BottombarLayoutProps>(
  (
    {
      children,
      left,
      center,
      right,
      height = '2.5rem',
      bordered = true,
      className = '',
      style,
      ...props
    },
    ref,
  ) => {
    const hasSlots = left !== undefined || center !== undefined || right !== undefined;

    const cssVars = {
      '--bottombar-height': typeof height === 'number' ? `${String(height)}px` : height,
      ...style,
    } as CSSProperties;

    return (
      <footer
        ref={ref}
        className={`bottombar ${bordered ? 'bottombar--bordered' : ''} ${className}`.trim()}
        style={cssVars}
        {...props}
      >
        {hasSlots ? (
          <>
            <div className="bottombar-section bottombar-section--left">{left}</div>
            <div className="bottombar-section bottombar-section--center">{center}</div>
            <div className="bottombar-section bottombar-section--right">{right}</div>
          </>
        ) : (
          children
        )}
      </footer>
    );
  },
);

BottombarLayout.displayName = 'BottombarLayout';
