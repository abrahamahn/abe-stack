// src/apps/web/src/app/layouts/AppSidePeekLayout.tsx
import { Button, SidePeek } from '@abe-stack/ui';
import { SidePeekUILibraryContent } from '@ui-library/components/SidePeekUILibraryContent';
import { useCallback, useState } from 'react';

import type { ReactElement } from 'react';

export interface AppSidePeekLayoutProps {
  open: boolean;
  onClose: () => void;
}

export const AppSidePeekLayout = ({ open, onClose }: AppSidePeekLayoutProps): ReactElement => {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const handleExpand = useCallback((): void => {
    setIsFullscreen((prev) => !prev);
  }, []);

  return (
    <SidePeek.Root open={open} onClose={onClose} size={isFullscreen ? 'full' : 'md'}>
      <SidePeek.Header>
        <SidePeek.Title>Side Peek UI Library</SidePeek.Title>
        <Button
          type="button"
          variant="text"
          onClick={handleExpand}
          aria-label="Toggle fullscreen"
          className="side-peek-close"
        >
          {isFullscreen ? '⤡' : '⤢'}
        </Button>
        <SidePeek.Close />
      </SidePeek.Header>
      <SidePeek.Content>
        <SidePeekUILibraryContent />
      </SidePeek.Content>
    </SidePeek.Root>
  );
};
