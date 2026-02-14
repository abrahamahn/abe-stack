// main/apps/web/src/app/layouts/AppRightLayout.tsx
import type { ReactElement, ReactNode } from 'react';

export interface AppRightLayoutProps {
  children: ReactNode;
}

export const AppRightLayout = ({ children }: AppRightLayoutProps): ReactElement => {
  return (
    <div className="panel border-l relative h-full">
      <span className="layout-label absolute top-0 left-0 p-1 text-[8px] opacity-20 pointer-events-none">
        RightSidebarLayout
      </span>
      <div className="panel-content p-2 overflow-auto">{children}</div>
    </div>
  );
};
