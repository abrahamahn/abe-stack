// main/client/ui/src/components/UndoRedoToolbar.test.tsx
/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { UndoRedoToolbar } from './UndoRedoToolbar';

describe('UndoRedoToolbar', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders undo and redo buttons', () => {
    render(<UndoRedoToolbar canUndo={true} canRedo={true} onUndo={vi.fn()} onRedo={vi.fn()} />);

    expect(screen.getByText('Undo')).toBeInTheDocument();
    expect(screen.getByText('Redo')).toBeInTheDocument();
  });

  it('disables undo button when canUndo is false', () => {
    render(<UndoRedoToolbar canUndo={false} canRedo={true} onUndo={vi.fn()} onRedo={vi.fn()} />);

    const undoBtn = screen.getByText('Undo').closest('button');
    expect(undoBtn).toBeDisabled();
  });

  it('disables redo button when canRedo is false', () => {
    render(<UndoRedoToolbar canUndo={true} canRedo={false} onUndo={vi.fn()} onRedo={vi.fn()} />);

    const redoBtn = screen.getByText('Redo').closest('button');
    expect(redoBtn).toBeDisabled();
  });

  it('calls onUndo when undo button is clicked', () => {
    const onUndo = vi.fn();
    render(<UndoRedoToolbar canUndo={true} canRedo={false} onUndo={onUndo} onRedo={vi.fn()} />);

    fireEvent.click(screen.getByText('Undo'));
    expect(onUndo).toHaveBeenCalledTimes(1);
  });

  it('calls onRedo when redo button is clicked', () => {
    const onRedo = vi.fn();
    render(<UndoRedoToolbar canUndo={false} canRedo={true} onUndo={vi.fn()} onRedo={onRedo} />);

    fireEvent.click(screen.getByText('Redo'));
    expect(onRedo).toHaveBeenCalledTimes(1);
  });

  it('has toolbar role with correct aria-label', () => {
    render(<UndoRedoToolbar canUndo={false} canRedo={false} onUndo={vi.fn()} onRedo={vi.fn()} />);

    expect(screen.getByRole('toolbar', { name: 'Undo/Redo' })).toBeInTheDocument();
  });

  it('includes keyboard shortcut in aria-label', () => {
    render(<UndoRedoToolbar canUndo={true} canRedo={true} onUndo={vi.fn()} onRedo={vi.fn()} />);

    // Non-mac environment returns Ctrl+Z / Ctrl+Y
    const undoBtn = screen.getByText('Undo').closest('button');
    expect(undoBtn?.getAttribute('aria-label')).toContain('Undo');
    expect(undoBtn?.getAttribute('aria-label')).toMatch(/Ctrl\+Z|Cmd\+Z/);

    const redoBtn = screen.getByText('Redo').closest('button');
    expect(redoBtn?.getAttribute('aria-label')).toContain('Redo');
    expect(redoBtn?.getAttribute('aria-label')).toMatch(/Ctrl\+Y|Cmd\+Shift\+Z/);
  });
});
