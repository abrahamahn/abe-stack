// client/ui/src/layouts/shells/RightSidebarLayout.tsx
import { forwardRef, type CSSProperties, type ReactNode } from 'react';
import '../../styles/layouts.css';

export type RightSidebarLayoutProps = {
  /** Main content (fallback if header/content not used) */
  children?: ReactNode;
  /** Header section content (e.g., title, close button) */
  header?: ReactNode;
  /** Main scrollable content */
  content?: ReactNode;
  /** Width of the panel @default '20rem' */
  width?: string | number;
  /** Whether to show a left border @default true */
  bordered?: boolean;
  /** Callback when close is triggered */
  onClose?: () => void;
  /** Additional CSS class */
  className?: string;
  /** Additional inline styles */
  style?: CSSProperties;
};

/**
 * A right sidebar/panel component with header and content sections.
 * Typically used for documentation, details, or property panels.
 * Use as the aside slot in AppShell or standalone.
 *
 * @example
 * ```tsx
 * <RightSidebarLayout
 *   header={
 *     <div className="panel-header">
 *       <Heading>Documentation</Heading>
 *       <CloseButton onClick={handleClose} />
 *     </div>
 *   }
 *   content={<DocumentationContent />}
 *   bordered
 * />
 * ```
 */
export const RightSidebarLayout = forwardRef<HTMLDivElement, RightSidebarLayoutProps>(
  (
    {
      children,
      header,
      content,
      width = '20rem',
      bordered = true,
      className = '',
      style,
      ...props
    },
    ref,
  ) => {
    const hasSlots = header !== undefined || content !== undefined;

    const cssVars = {
      ['--right-sidebar-width']: typeof width === 'number' ? `${String(width)}px` : width,
      ...style,
    } as CSSProperties;

    return (
      <aside
        ref={ref}
        className={`right-sidebar ${bordered ? 'right-sidebar--bordered' : ''} ${className}`.trim()}
        style={cssVars}
        {...props}
      >
        {hasSlots ? (
          <>
            {header != null && <div className="right-sidebar-header">{header}</div>}
            {content != null && <div className="right-sidebar-content">{content}</div>}
          </>
        ) : (
          children
        )}
      </aside>
    );
  },
);

RightSidebarLayout.displayName = 'RightSidebarLayout';
