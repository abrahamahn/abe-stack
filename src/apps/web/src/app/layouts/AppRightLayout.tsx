// src/apps/web/src/app/layouts/AppRightLayout.tsx
import { CloseButton, Heading } from '@abe-stack/ui';

import type { ReactElement, ReactNode } from 'react';

export interface AppRightLayoutProps {
  title?: string;
  onClose: () => void;
  children: ReactNode;
}

export const AppRightLayout = ({
  title = 'Details',
  onClose,
  children,
}: AppRightLayoutProps): ReactElement => {
  return (
    <div className="panel border-l relative h-full">
      <span className="layout-label absolute top-0 left-0 p-1 text-[8px] opacity-20 pointer-events-none">
        RightSidebarLayout
      </span>
      <div className="panel-header p-2 border-b flex items-center justify-between">
        <Heading as="h2" size="md">
          {title}
        </Heading>
        <CloseButton aria-label="Collapse right panel" onClick={onClose} />
      </div>
      <div className="panel-content p-2 overflow-auto">{children}</div>
    </div>
  );
};
