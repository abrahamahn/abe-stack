// src/apps/web/src/features/ui-library/components/UILibrarySidePeek.tsx
import { SidePeek } from '@abe-stack/ui';
import { SidePeekUILibraryContent } from '@ui-library/components';

import type { ReactElement } from 'react';

export interface UILibrarySidePeekProps {
  open: boolean;
  onClose: () => void;
}

export const UILibrarySidePeek = ({ open, onClose }: UILibrarySidePeekProps): ReactElement => {
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
