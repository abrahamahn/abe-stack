// src/apps/web/src/app/layouts/AppLeftLayout.tsx
import { CloseButton, Heading } from '@abe-stack/ui';

import type { ReactElement, ReactNode } from 'react';

export interface AppLeftLayoutProps {
  title?: string;
  onClose: () => void;
  children: ReactNode;
}

export const AppLeftLayout = ({
  title = 'Navigation',
  onClose,
  children,
}: AppLeftLayoutProps): ReactElement => {
  return (
    <div className="panel border-r relative h-full">
      <span className="layout-label absolute top-0 right-0 p-1 text-[8px] opacity-20 pointer-events-none">
        LeftSidebarLayout
      </span>
      <div className="panel-header p-2 border-b flex items-center justify-between">
        <Heading as="h2" size="md">
          {title}
        </Heading>
        <CloseButton aria-label="Collapse left panel" onClick={onClose} />
      </div>
      <div className="panel-content flex-1 overflow-auto">{children}</div>
    </div>
  );
};
