// main/apps/web/src/features/settings/hooks/useUndoHandler.test.ts
/** @vitest-environment jsdom */
import { createSetOperation, createTransaction } from '@abe-stack/shared';
import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import { useUndoHandler } from './useUndoHandler';

// ============================================================================
// Mock the settings API
// ============================================================================

const mockUpdateProfile = vi.fn().mockResolvedValue({});

vi.mock('../api', () => ({
  createSettingsApi: vi.fn(() => ({
    updateProfile: mockUpdateProfile,
  })),
}));

describe('useUndoHandler', () => {
  beforeEach(() => {
    vi.stubGlobal('crypto', {
      randomUUID: vi.fn(() => `uuid-${Math.random().toString(36).slice(2)}`),
    });
    mockUpdateProfile.mockClear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns a stable handler reference', () => {
    const { result, rerender } = renderHook(() => useUndoHandler());

    const first = result.current;
    rerender();
    expect(result.current).toBe(first);
  });

  it('applies a set operation for users path via settings API', async () => {
    const { result } = renderHook(() => useUndoHandler());

    const tx = createTransaction([
      createSetOperation(['users', 'me', 'firstName'], 'Alice', 'Bob'),
    ]);

    await result.current.apply(tx);

    expect(mockUpdateProfile).toHaveBeenCalledWith({ firstName: 'Alice' });
  });

  it('applies multiple set operations in sequence', async () => {
    const { result } = renderHook(() => useUndoHandler());

    const tx = createTransaction([
      createSetOperation(['users', 'me', 'firstName'], 'Alice', 'Bob'),
      createSetOperation(['users', 'me', 'lastName'], 'Smith', 'Jones'),
    ]);

    await result.current.apply(tx);

    expect(mockUpdateProfile).toHaveBeenCalledTimes(2);
    expect(mockUpdateProfile).toHaveBeenCalledWith({ firstName: 'Alice' });
    expect(mockUpdateProfile).toHaveBeenCalledWith({ lastName: 'Smith' });
  });

  it('ignores non-set operations', async () => {
    const { result } = renderHook(() => useUndoHandler());

    const tx = createTransaction([
      {
        type: 'listInsert' as const,
        path: ['users', 'me', 'tags'],
        value: 'new',
        position: 'append' as const,
      },
    ]);

    await result.current.apply(tx);

    expect(mockUpdateProfile).not.toHaveBeenCalled();
  });

  it('ignores set operations with unknown domain', async () => {
    const { result } = renderHook(() => useUndoHandler());

    const tx = createTransaction([createSetOperation(['unknown', 'id', 'field'], 'value', 'old')]);

    await result.current.apply(tx);

    expect(mockUpdateProfile).not.toHaveBeenCalled();
  });
});
