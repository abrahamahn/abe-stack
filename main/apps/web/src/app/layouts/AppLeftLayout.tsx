// main/apps/web/src/app/layouts/AppLeftLayout.tsx
import type { ReactElement, ReactNode } from 'react';

export interface AppLeftLayoutProps {
  children: ReactNode;
}

export const AppLeftLayout = ({ children }: AppLeftLayoutProps): ReactElement => {
  return (
    <div className="panel border-r relative h-full">
      <span className="layout-label absolute top-0 right-0 p-1 text-[8px] opacity-20 pointer-events-none">
        LeftSidebarLayout
      </span>
      <div className="panel-content flex-1 overflow-auto">{children}</div>
    </div>
  );
};
