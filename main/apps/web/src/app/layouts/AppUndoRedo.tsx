// main/apps/web/src/app/layouts/AppUndoRedo.tsx
import { useUndoRedoController } from '@bslt/react';
import { UndoRedoToolbar } from '@bslt/ui';
import { useUndoHandler } from '@features/settings/hooks/useUndoHandler';

import type { ReactElement } from 'react';

/**
 * App-level undo/redo wrapper.
 * Activates keyboard shortcuts and renders the toolbar buttons.
 * The handler dispatches inverse transactions to the appropriate API endpoints.
 */
export const AppUndoRedo = (): ReactElement => {
  const handler = useUndoHandler();
  const { undo, redo, canUndo, canRedo } = useUndoRedoController({
    handler,
    enabled: true,
    skipInputs: true,
  });

  return <UndoRedoToolbar canUndo={canUndo} canRedo={canRedo} onUndo={undo} onRedo={redo} />;
};
