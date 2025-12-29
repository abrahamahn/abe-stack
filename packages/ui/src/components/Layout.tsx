import type { CSSProperties, ReactElement, ReactNode } from 'react';
import '../theme/theme.css';

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

  return (
    <div
      className={className}
      style={{
        display: 'grid',
        gridTemplateRows: `${top ? 'auto' : ''} minmax(0, 1fr) ${bottom ? 'auto' : ''}`.trim(),
        gap,
        minHeight: '100vh',
        ...style,
      }}
    >
      {top ? <header>{top}</header> : null}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: columns,
          gap,
          alignItems: 'stretch',
          minHeight: 0,
        }}
      >
        {hasLeft ? <aside style={{ minWidth: minLeftWidth }}>{left}</aside> : null}
        <main style={{ minWidth: 0 }}>{children}</main>
        {hasRight ? <aside style={{ minWidth: minRightWidth }}>{right}</aside> : null}
      </div>

      {bottom ? <footer>{bottom}</footer> : null}
    </div>
  );
}
