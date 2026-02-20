// main/apps/web/src/features/shared/components/UndoRedoToolbar.tsx
/**
 * UndoRedoToolbar
 *
 * A toolbar component that displays undo/redo buttons with keyboard shortcut
 * hints. Integrates with the existing undoRedoStore and useUndoRedoShortcuts
 * hook to provide a complete undo/redo UI experience.
 *
 * @packageDocumentation
 */

import {
  getUndoRedoShortcutTexts,
  useUndoRedoShortcuts,
} from '@bslt/react';

import { useUndoRedoStore } from '@bslt/react';

import type { ReactElement } from 'react';

// ============================================================================
// Types
// ============================================================================

export interface UndoRedoToolbarProps {
  /** Additional CSS class name for the toolbar container */
  className?: string;
  /** Whether to show operation count indicators */
  showCount?: boolean;
  /** Whether to show keyboard shortcut hints on the buttons */
  showShortcutHints?: boolean;
  /** Optional label displayed between the buttons */
  label?: string;
}

// ============================================================================
// Component
// ============================================================================

/**
 * Toolbar component for undo/redo operations.
 *
 * Renders undo and redo buttons that are disabled when the respective
 * stack is empty. Integrates keyboard shortcuts via `useUndoRedoShortcuts`.
 *
 * @example
 * ```tsx
 * <UndoRedoToolbar showCount showShortcutHints />
 * ```
 */
export function UndoRedoToolbar({
  className,
  showCount = false,
  showShortcutHints = true,
  label,
}: UndoRedoToolbarProps): ReactElement {
  const store = useUndoRedoStore();
  const canUndo = store.canUndo();
  const canRedo = store.canRedo();
  const undoCount = store.undoStackSize();
  const redoCount = store.redoStackSize();
  const shortcuts = getUndoRedoShortcutTexts();

  const handleUndo = (): void => {
    const inverse = store.undo();
    if (inverse !== undefined) {
      // The inverse transaction is returned for the caller to apply.
      // In the integrated scenario, useUndoRedoIntegration handles this.
      // Here we just trigger the store operation.
    }
  };

  const handleRedo = (): void => {
    const tx = store.redo();
    if (tx !== undefined) {
      // The transaction is returned for the caller to re-apply.
    }
  };

  const { triggerUndo, triggerRedo } = useUndoRedoShortcuts({
    onUndo: handleUndo,
    onRedo: handleRedo,
    canUndo,
    canRedo,
  });

  return (
    <div
      className={`inline-flex items-center gap-1 ${className ?? ''}`}
      role="toolbar"
      aria-label="Undo and redo actions"
      data-testid="undo-redo-toolbar"
    >
      <button
        type="button"
        onClick={triggerUndo}
        disabled={!canUndo}
        aria-label={`Undo${showShortcutHints ? ` (${shortcuts.undo})` : ''}`}
        title={`Undo${showShortcutHints ? ` (${shortcuts.undo})` : ''}`}
        data-testid="undo-button"
        className="inline-flex items-center justify-center rounded px-2 py-1 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span aria-hidden="true">&#x21A9;</span>
        <span className="ml-1">Undo</span>
        {showCount && undoCount > 0 && (
          <span className="ml-1 text-xs opacity-70" data-testid="undo-count">
            ({undoCount})
          </span>
        )}
      </button>

      {label !== undefined && (
        <span className="text-sm opacity-70 px-1" data-testid="toolbar-label">
          {label}
        </span>
      )}

      <button
        type="button"
        onClick={triggerRedo}
        disabled={!canRedo}
        aria-label={`Redo${showShortcutHints ? ` (${shortcuts.redo})` : ''}`}
        title={`Redo${showShortcutHints ? ` (${shortcuts.redo})` : ''}`}
        data-testid="redo-button"
        className="inline-flex items-center justify-center rounded px-2 py-1 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span aria-hidden="true">&#x21AA;</span>
        <span className="ml-1">Redo</span>
        {showCount && redoCount > 0 && (
          <span className="ml-1 text-xs opacity-70" data-testid="redo-count">
            ({redoCount})
          </span>
        )}
      </button>

      {showShortcutHints && (
        <span className="text-xs opacity-50 ml-2" data-testid="shortcut-hints">
          {shortcuts.undo} / {shortcuts.redo}
        </span>
      )}
    </div>
  );
}
