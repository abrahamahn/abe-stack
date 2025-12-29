import { cn } from '../utils/cn';

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
      style={{ display: 'grid', gridTemplateColumns: '280px 1fr', minHeight: '100vh' }}
    >
      <aside
        style={{
          borderRight: '1px solid var(--gray3, #e5e7eb)',
          padding: '16px',
          background: 'var(--gray1, #f9fafb)',
        }}
      >
        {sidebar}
      </aside>
      <main>
        {header ? (
          <div
            style={{
              borderBottom: '1px solid var(--gray3, #e5e7eb)',
              padding: '16px',
              background: 'var(--surface, #fff)',
            }}
          >
            {header}
          </div>
        ) : null}
        <div style={{ padding: '24px' }}>{children}</div>
      </main>
    </div>
  );
}
