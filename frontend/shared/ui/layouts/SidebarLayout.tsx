import { cn } from '../utils/cn';
import '../styles/layouts.css';

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
    <div className={cn('ui-sidebar-layout', className)}>
      <aside className="ui-sidebar-layout-sidebar">{sidebar}</aside>
      <main className="ui-sidebar-layout-main">
        {header ? <div className="ui-sidebar-layout-header">{header}</div> : null}
        <div className="ui-sidebar-layout-body">{children}</div>
      </main>
    </div>
  );
}
