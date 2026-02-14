// main/client/ui/src/components/UndoHistoryPanel.tsx

import { useUndoRedoStore } from '@abe-stack/react';

import { Button } from '../elements/Button';
import { Text } from '../elements/Text';

import type { Transaction } from '@abe-stack/shared';
import type { ReactElement } from 'react';

/** Props for the UndoHistoryPanel component. */
export interface UndoHistoryPanelProps {
  /** Called when user clicks "Undo to here" — receives the number of steps to undo */
  onUndoToIndex?: (steps: number) => void;
}

/**
 * Format an operation path into a human-readable label.
 * e.g. ['users', 'me', 'firstName'] → "Updated firstName"
 */
function formatTransactionLabel(tx: Transaction): string {
  const firstOp = tx.operations[0];
  if (firstOp === undefined) return 'Unknown action';

  const field = firstOp.path[firstOp.path.length - 1] ?? 'field';
  const domain = firstOp.path[0] ?? '';

  const prefix = domain === 'users' ? 'profile' : domain === 'workspaces' ? 'workspace' : domain;

  if (tx.operations.length === 1) {
    return `Updated ${prefix} ${field}`;
  }
  return `Updated ${prefix} (${String(tx.operations.length)} fields)`;
}

/**
 * Panel that lists recent undo stack entries with human-readable descriptions.
 * Each entry shows the operation label and an "Undo to here" button.
 */
export const UndoHistoryPanel = ({ onUndoToIndex }: UndoHistoryPanelProps): ReactElement => {
  const { undoStack } = useUndoRedoStore();

  if (undoStack.length === 0) {
    return (
      <div className="p-3">
        <Text className="text-muted">No actions to undo</Text>
      </div>
    );
  }

  // Show most recent first
  const entries = [...undoStack].reverse();

  return (
    <div className="flex flex-col gap-1 p-2" role="list" aria-label="Undo history">
      {entries.map((tx, index) => (
        <div
          key={tx.id}
          className="flex items-center justify-between gap-2 p-2 rounded border"
          role="listitem"
        >
          <Text style={{ fontSize: 'var(--ui-font-size-sm)' }}>{formatTransactionLabel(tx)}</Text>
          {onUndoToIndex !== undefined && (
            <Button
              variant="text"
              size="small"
              onClick={() => {
                onUndoToIndex(index + 1);
              }}
            >
              Undo to here
            </Button>
          )}
        </div>
      ))}
    </div>
  );
};
