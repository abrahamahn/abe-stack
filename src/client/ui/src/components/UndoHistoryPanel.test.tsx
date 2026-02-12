// src/client/ui/src/components/UndoHistoryPanel.test.tsx
/** @vitest-environment jsdom */
import { createSetOperation, createTransaction } from '@abe-stack/shared';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { UndoHistoryPanel } from './UndoHistoryPanel';

// ============================================================================
// Mock the undo/redo store
// ============================================================================

import type { Transaction } from '@abe-stack/shared';

let mockUndoStack: Transaction[] = [];

vi.mock('@abe-stack/react', () => ({
  useUndoRedoStore: () => ({
    undoStack: mockUndoStack,
  }),
}));

describe('UndoHistoryPanel', () => {
  beforeEach(() => {
    vi.stubGlobal('crypto', {
      randomUUID: vi.fn(() => `uuid-${Math.random().toString(36).slice(2)}`),
    });
    mockUndoStack = [];
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('shows empty state when stack is empty', () => {
    render(<UndoHistoryPanel />);

    expect(screen.getByText('No actions to undo')).toBeInTheDocument();
  });

  it('renders entries from undo stack', () => {
    mockUndoStack = [
      createTransaction([createSetOperation(['users', 'me', 'firstName'], 'Alice', 'Bob')]),
    ];

    render(<UndoHistoryPanel />);

    expect(screen.getByText('Updated profile firstName')).toBeInTheDocument();
  });

  it('shows field count for multi-field transactions', () => {
    mockUndoStack = [
      createTransaction([
        createSetOperation(['users', 'me', 'firstName'], 'Alice', 'Bob'),
        createSetOperation(['users', 'me', 'lastName'], 'Smith', 'Jones'),
      ]),
    ];

    render(<UndoHistoryPanel />);

    expect(screen.getByText('Updated profile (2 fields)')).toBeInTheDocument();
  });

  it('renders "Undo to here" buttons when callback is provided', () => {
    mockUndoStack = [
      createTransaction([createSetOperation(['users', 'me', 'firstName'], 'Alice', 'Bob')]),
    ];

    const onUndoToIndex = vi.fn();
    render(<UndoHistoryPanel onUndoToIndex={onUndoToIndex} />);

    const button = screen.getByText('Undo to here');
    expect(button).toBeInTheDocument();

    fireEvent.click(button);
    expect(onUndoToIndex).toHaveBeenCalledWith(1);
  });

  it('does not render buttons when no callback is provided', () => {
    mockUndoStack = [
      createTransaction([createSetOperation(['users', 'me', 'firstName'], 'Alice', 'Bob')]),
    ];

    render(<UndoHistoryPanel />);

    expect(screen.queryByText('Undo to here')).not.toBeInTheDocument();
  });

  it('shows most recent entries first', () => {
    mockUndoStack = [
      createTransaction([createSetOperation(['users', 'me', 'firstName'], 'Alice', 'Bob')]),
      createTransaction([createSetOperation(['workspaces', 'ws-1', 'name'], 'New', 'Old')]),
    ];

    render(<UndoHistoryPanel />);

    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(2);
    // Most recent (workspace) should appear first
    expect(items[0]?.textContent).toContain('workspace');
    expect(items[1]?.textContent).toContain('profile');
  });

  it('has list role with correct aria-label', () => {
    mockUndoStack = [
      createTransaction([createSetOperation(['users', 'me', 'firstName'], 'Alice', 'Bob')]),
    ];

    render(<UndoHistoryPanel />);

    expect(screen.getByRole('list', { name: 'Undo history' })).toBeInTheDocument();
  });
});
