// src/apps/web/src/app/layouts/AppSidePeekLayout.tsx
import { SidePeek } from '@abe-stack/ui';
import { SidePeekUILibraryContent } from '@ui-library/components';

import type { ReactElement } from 'react';

export interface AppSidePeekLayoutProps {
  open: boolean;
  onClose: () => void;
}

export const AppSidePeekLayout = ({ open, onClose }: AppSidePeekLayoutProps): ReactElement => {
  return (
    <SidePeek.Root open={open} onClose={onClose} size="md">
      <SidePeek.Header>
        <SidePeek.Title>Side Peek UI Library</SidePeek.Title>
        <div className="flex gap-2">
          <SidePeek.Expand to="/side-peek-ui-library" />
          <SidePeek.Close />
        </div>
      </SidePeek.Header>
      <SidePeek.Content>
        <SidePeekUILibraryContent actionLabel="Close this panel" onAction={onClose} />
      </SidePeek.Content>
    </SidePeek.Root>
  );
};
