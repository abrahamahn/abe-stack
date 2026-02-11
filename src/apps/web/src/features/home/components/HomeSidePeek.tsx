// src/apps/web/src/features/home/components/HomeSidePeek.tsx
import { Button, SidePeek, Text } from '@abe-stack/ui';
import { useCallback, useState } from 'react';

import type { ReactElement } from 'react';

export interface HomeSidePeekProps {
  open: boolean;
  onClose: () => void;
}

export const HomeSidePeek = ({ open, onClose }: HomeSidePeekProps): ReactElement => {
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
        <Text tone="muted">Side peek content</Text>
      </SidePeek.Content>
    </SidePeek.Root>
  );
};
