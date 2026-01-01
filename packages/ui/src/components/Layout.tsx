import { cn } from '../utils/cn';

import '../styles/components.css';
import type { CSSProperties, ReactElement, ReactNode } from 'react';

type LayoutProps = {
  top?: ReactNode;
  bottom?: ReactNode;
  left?: ReactNode;
  right?: ReactNode;
  children?: ReactNode;
  gap?: string;
  minLeftWidth?: string;
  minRightWidth?: string;
  style?: CSSProperties;
  className?: string;
};

export function Layout({
  top,
  bottom,
  left,
  right,
  children,
  gap = 'var(--ui-gap-lg)',
  minLeftWidth = '220px',
  minRightWidth = '260px',
  style,
  className,
}: LayoutProps): ReactElement {
  const hasLeft = Boolean(left);
  const hasRight = Boolean(right);

  const columns = [
    hasLeft ? `minmax(${minLeftWidth}, 1fr)` : null,
    'minmax(0, 2fr)',
    hasRight ? `minmax(${minRightWidth}, 1fr)` : null,
  ]
    .filter(Boolean)
    .join(' ');

  const cssVars = {
    '--ui-layout-gap': gap,
    '--ui-layout-columns': columns || 'minmax(0, 1fr)',
    '--ui-layout-left-min-width': minLeftWidth,
    '--ui-layout-right-min-width': minRightWidth,
    '--ui-layout-top-row': top ? 'auto' : '0px',
    '--ui-layout-bottom-row': bottom ? 'auto' : '0px',
    ...style,
  } as CSSProperties;

  return (
    <div className={cn('ui-layout', className)} style={cssVars}>
      {top ? <header className="ui-layout-header">{top}</header> : null}

      <div className="ui-layout-main-grid">
        {hasLeft ? <aside className="ui-layout-left">{left}</aside> : null}
        <main className="ui-layout-content">{children}</main>
        {hasRight ? <aside className="ui-layout-right">{right}</aside> : null}
      </div>

      {bottom ? <footer className="ui-layout-footer">{bottom}</footer> : null}
    </div>
  );
}
