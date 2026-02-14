// main/client/ui/src/components/UndoRedoToolbar.tsx
import { getRedoShortcutText, getUndoShortcutText } from '@abe-stack/react';

import { Button } from '../elements/Button';

import type { ReactElement } from 'react';

/** Props for the UndoRedoToolbar component. */
export interface UndoRedoToolbarProps {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
}

/**
 * A toolbar with undo/redo buttons and platform-aware keyboard shortcut hints.
 *
 * @example
 * ```tsx
 * <UndoRedoToolbar canUndo={true} canRedo={false} onUndo={undo} onRedo={redo} />
 * ```
 */
export const UndoRedoToolbar = ({
  canUndo,
  canRedo,
  onUndo,
  onRedo,
}: UndoRedoToolbarProps): ReactElement => (
  <div className="flex items-center gap-1" role="toolbar" aria-label="Undo/Redo">
    <Button
      variant="text"
      size="small"
      disabled={!canUndo}
      onClick={onUndo}
      aria-label={`Undo (${getUndoShortcutText()})`}
      title={getUndoShortcutText()}
    >
      Undo
    </Button>
    <Button
      variant="text"
      size="small"
      disabled={!canRedo}
      onClick={onRedo}
      aria-label={`Redo (${getRedoShortcutText()})`}
      title={getRedoShortcutText()}
    >
      Redo
    </Button>
  </div>
);
