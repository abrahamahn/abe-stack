// main/apps/web/src/features/shared/components/UndoRedoToolbar.test.tsx
/** @vitest-environment jsdom */

import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { UndoRedoToolbar } from './UndoRedoToolbar';

import type { Transaction } from '@bslt/shared';

// ============================================================================
// Mocks
// ============================================================================

const mockUndo = vi.fn();
const mockRedo = vi.fn();
const mockCanUndo = vi.fn();
const mockCanRedo = vi.fn();
const mockUndoStackSize = vi.fn();
const mockRedoStackSize = vi.fn();

vi.mock('@bslt/react', () => {
  const triggerUndoFn = vi.fn();
  const triggerRedoFn = vi.fn();

  return {
    useUndoRedoStore: () => ({
      undo: mockUndo,
      redo: mockRedo,
      canUndo: mockCanUndo,
      canRedo: mockCanRedo,
      undoStackSize: mockUndoStackSize,
      redoStackSize: mockRedoStackSize,
      push: vi.fn(),
      clear: vi.fn(),
      undoStack: [],
      redoStack: [],
      lastTimestamp: 0,
    }),
    useUndoRedoShortcuts: (options: {
      onUndo: () => void;
      onRedo: () => void;
      canUndo: boolean;
      canRedo: boolean;
    }) => {
      // Store the callbacks so button clicks can invoke them
      triggerUndoFn.mockImplementation(() => {
        if (options.canUndo) {
          options.onUndo();
        }
      });
      triggerRedoFn.mockImplementation(() => {
        if (options.canRedo) {
          options.onRedo();
        }
      });
      return {
        triggerUndo: triggerUndoFn,
        triggerRedo: triggerRedoFn,
      };
    },
    getUndoRedoShortcutTexts: () => ({
      undo: 'Ctrl+Z',
      redo: 'Ctrl+Y',
    }),
  };
});

// ============================================================================
// Tests
// ============================================================================

describe('UndoRedoToolbar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCanUndo.mockReturnValue(false);
    mockCanRedo.mockReturnValue(false);
    mockUndoStackSize.mockReturnValue(0);
    mockRedoStackSize.mockReturnValue(0);
  });

  describe('rendering', () => {
    it('should render the toolbar with undo and redo buttons', () => {
      render(<UndoRedoToolbar />);

      expect(screen.getByTestId('undo-redo-toolbar')).toBeInTheDocument();
      expect(screen.getByTestId('undo-button')).toBeInTheDocument();
      expect(screen.getByTestId('redo-button')).toBeInTheDocument();
    });

    it('should have toolbar role and accessible label', () => {
      render(<UndoRedoToolbar />);

      const toolbar = screen.getByTestId('undo-redo-toolbar');
      expect(toolbar).toHaveAttribute('role', 'toolbar');
      expect(toolbar).toHaveAttribute('aria-label', 'Undo and redo actions');
    });

    it('should render shortcut hints by default', () => {
      render(<UndoRedoToolbar />);

      expect(screen.getByTestId('shortcut-hints')).toBeInTheDocument();
      expect(screen.getByTestId('shortcut-hints').textContent).toBe('Ctrl+Z / Ctrl+Y');
    });

    it('should hide shortcut hints when showShortcutHints is false', () => {
      render(<UndoRedoToolbar showShortcutHints={false} />);

      expect(screen.queryByTestId('shortcut-hints')).toBeNull();
    });

    it('should apply custom className', () => {
      render(<UndoRedoToolbar className="my-custom-class" />);

      const toolbar = screen.getByTestId('undo-redo-toolbar');
      expect(toolbar.className).toContain('my-custom-class');
    });

    it('should render label when provided', () => {
      render(<UndoRedoToolbar label="Edit History" />);

      expect(screen.getByTestId('toolbar-label')).toBeInTheDocument();
      expect(screen.getByTestId('toolbar-label').textContent).toBe('Edit History');
    });

    it('should not render label when not provided', () => {
      render(<UndoRedoToolbar />);

      expect(screen.queryByTestId('toolbar-label')).toBeNull();
    });
  });

  describe('disabled states', () => {
    it('should disable undo button when canUndo is false', () => {
      mockCanUndo.mockReturnValue(false);

      render(<UndoRedoToolbar />);

      expect(screen.getByTestId('undo-button')).toBeDisabled();
    });

    it('should enable undo button when canUndo is true', () => {
      mockCanUndo.mockReturnValue(true);

      render(<UndoRedoToolbar />);

      expect(screen.getByTestId('undo-button')).not.toBeDisabled();
    });

    it('should disable redo button when canRedo is false', () => {
      mockCanRedo.mockReturnValue(false);

      render(<UndoRedoToolbar />);

      expect(screen.getByTestId('redo-button')).toBeDisabled();
    });

    it('should enable redo button when canRedo is true', () => {
      mockCanRedo.mockReturnValue(true);

      render(<UndoRedoToolbar />);

      expect(screen.getByTestId('redo-button')).not.toBeDisabled();
    });

    it('should disable both buttons when stacks are empty', () => {
      mockCanUndo.mockReturnValue(false);
      mockCanRedo.mockReturnValue(false);

      render(<UndoRedoToolbar />);

      expect(screen.getByTestId('undo-button')).toBeDisabled();
      expect(screen.getByTestId('redo-button')).toBeDisabled();
    });
  });

  describe('operation counts', () => {
    it('should not show counts by default', () => {
      mockUndoStackSize.mockReturnValue(3);
      mockRedoStackSize.mockReturnValue(2);

      render(<UndoRedoToolbar />);

      expect(screen.queryByTestId('undo-count')).toBeNull();
      expect(screen.queryByTestId('redo-count')).toBeNull();
    });

    it('should show undo count when showCount is true and count > 0', () => {
      mockCanUndo.mockReturnValue(true);
      mockUndoStackSize.mockReturnValue(3);

      render(<UndoRedoToolbar showCount />);

      expect(screen.getByTestId('undo-count')).toBeInTheDocument();
      expect(screen.getByTestId('undo-count').textContent).toBe('(3)');
    });

    it('should show redo count when showCount is true and count > 0', () => {
      mockCanRedo.mockReturnValue(true);
      mockRedoStackSize.mockReturnValue(5);

      render(<UndoRedoToolbar showCount />);

      expect(screen.getByTestId('redo-count')).toBeInTheDocument();
      expect(screen.getByTestId('redo-count').textContent).toBe('(5)');
    });

    it('should not show counts when stacks are empty even with showCount', () => {
      mockUndoStackSize.mockReturnValue(0);
      mockRedoStackSize.mockReturnValue(0);

      render(<UndoRedoToolbar showCount />);

      expect(screen.queryByTestId('undo-count')).toBeNull();
      expect(screen.queryByTestId('redo-count')).toBeNull();
    });
  });

  describe('click handlers', () => {
    it('should call triggerUndo when undo button is clicked', () => {
      mockCanUndo.mockReturnValue(true);
      const mockInverse: Transaction = {
        id: 'inv-1',
        timestamp: Date.now(),
        operations: [{ type: 'set', path: ['a'], value: 0, previousValue: 1 }],
      };
      mockUndo.mockReturnValue(mockInverse);

      render(<UndoRedoToolbar />);
      fireEvent.click(screen.getByTestId('undo-button'));

      expect(mockUndo).toHaveBeenCalled();
    });

    it('should call triggerRedo when redo button is clicked', () => {
      mockCanRedo.mockReturnValue(true);
      const mockTx: Transaction = {
        id: 'tx-1',
        timestamp: Date.now(),
        operations: [{ type: 'set', path: ['a'], value: 1, previousValue: 0 }],
      };
      mockRedo.mockReturnValue(mockTx);

      render(<UndoRedoToolbar />);
      fireEvent.click(screen.getByTestId('redo-button'));

      expect(mockRedo).toHaveBeenCalled();
    });

    it('should not call undo when button is disabled and clicked', () => {
      mockCanUndo.mockReturnValue(false);

      render(<UndoRedoToolbar />);
      fireEvent.click(screen.getByTestId('undo-button'));

      expect(mockUndo).not.toHaveBeenCalled();
    });

    it('should not call redo when button is disabled and clicked', () => {
      mockCanRedo.mockReturnValue(false);

      render(<UndoRedoToolbar />);
      fireEvent.click(screen.getByTestId('redo-button'));

      expect(mockRedo).not.toHaveBeenCalled();
    });
  });

  describe('accessibility', () => {
    it('should include shortcut hint in undo button aria-label', () => {
      render(<UndoRedoToolbar />);

      const undoButton = screen.getByTestId('undo-button');
      expect(undoButton).toHaveAttribute('aria-label', 'Undo (Ctrl+Z)');
    });

    it('should include shortcut hint in redo button aria-label', () => {
      render(<UndoRedoToolbar />);

      const redoButton = screen.getByTestId('redo-button');
      expect(redoButton).toHaveAttribute('aria-label', 'Redo (Ctrl+Y)');
    });

    it('should not include shortcut hint when showShortcutHints is false', () => {
      render(<UndoRedoToolbar showShortcutHints={false} />);

      const undoButton = screen.getByTestId('undo-button');
      const redoButton = screen.getByTestId('redo-button');
      expect(undoButton).toHaveAttribute('aria-label', 'Undo');
      expect(redoButton).toHaveAttribute('aria-label', 'Redo');
    });
  });
});
