import { cn } from '../utils/cn';
import '../theme/theme.css';

import type { ReactElement, ReactNode } from 'react';

type SidebarLayoutProps = {
  sidebar: ReactNode;
  header?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function SidebarLayout({
  sidebar,
  header,
  children,
  className,
}: SidebarLayoutProps): ReactElement {
  return (
    <div
      className={cn('ui-sidebar-layout', className)}
      style={{
        display: 'grid',
        gridTemplateColumns: 'var(--ui-sidebar-width, 280px) 1fr',
        minHeight: '100vh',
      }}
    >
      <aside
        style={{
          borderRight: '1px solid var(--ui-color-border)',
          padding: 'var(--ui-gap-lg)',
          background: 'var(--ui-color-surface)',
        }}
      >
        {sidebar}
      </aside>
      <main>
        {header ? (
          <div
            style={{
              borderBottom: '1px solid var(--ui-color-border)',
              padding: 'var(--ui-gap-lg)',
              background: 'var(--ui-color-bg)',
            }}
          >
            {header}
          </div>
        ) : null}
        <div style={{ padding: 'var(--ui-gap-xl)' }}>{children}</div>
      </main>
    </div>
  );
}
