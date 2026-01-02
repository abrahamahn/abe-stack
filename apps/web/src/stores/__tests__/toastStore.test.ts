// apps/web/src/stores/__tests__/toastStore.test.ts
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { toastStore } from '../toastStore';

// Mock nanoid to have predictable unique IDs
let idCounter = 0;
vi.mock('nanoid', () => ({
  nanoid: () => `test-id-${++idCounter}`,
}));

describe('toastStore', () => {
  beforeEach(() => {
    // Reset ID counter and clear store before each test
    idCounter = 0;
    const store = toastStore.getState();
    act(() => {
      // Clear all messages
      while (store.messages.length > 0) {
        store.dismiss(store.messages[0].id);
      }
    });
  });

  describe('Initial State', () => {
    it('should initialize with empty messages array', () => {
      const { result } = renderHook(() => toastStore());
      expect(result.current.messages).toEqual([]);
    });

    it('should provide show and dismiss functions', () => {
      const { result } = renderHook(() => toastStore());
      expect(typeof result.current.show).toBe('function');
      expect(typeof result.current.dismiss).toBe('function');
    });
  });

  describe('show()', () => {
    it('should add a message with title only', async () => {
      const { result } = renderHook(() => toastStore());

      act(() => {
        result.current.show({ title: 'Test Title' });
      });

      await waitFor(() => {
        expect(result.current.messages).toHaveLength(1);
        expect(result.current.messages[0].title).toBe('Test Title');
      });
    });

    it('should add a message with description', async () => {
      const { result } = renderHook(() => toastStore());

      act(() => {
        result.current.show({ description: 'Test Description' });
      });

      await waitFor(() => {
        expect(result.current.messages).toHaveLength(1);
        expect(result.current.messages[0].description).toBe('Test Description');
      });
    });

    it('should add multiple messages', async () => {
      const { result } = renderHook(() => toastStore());

      act(() => {
        result.current.show({ title: 'Message 1' });
        result.current.show({ title: 'Message 2' });
      });

      await waitFor(() => {
        expect(result.current.messages).toHaveLength(2);
      });
    });

    it('should generate unique IDs', async () => {
      const { result } = renderHook(() => toastStore());

      act(() => {
        result.current.show({ title: 'Test 1' });
        result.current.show({ title: 'Test 2' });
      });

      await waitFor(() => {
        const ids = result.current.messages.map((m) => m.id);
        expect(new Set(ids).size).toBe(2); // All unique
      });
    });
  });

  describe('dismiss()', () => {
    it('should remove a message by ID', async () => {
      const { result } = renderHook(() => toastStore());

      act(() => {
        result.current.show({ title: 'Test' });
      });

      await waitFor(() => {
        expect(result.current.messages).toHaveLength(1);
      });

      const messageId = result.current.messages[0].id;

      act(() => {
        result.current.dismiss(messageId);
      });

      await waitFor(() => {
        expect(result.current.messages).toHaveLength(0);
      });
    });

    it('should handle dismissing non-existent ID', async () => {
      const { result } = renderHook(() => toastStore());

      act(() => {
        result.current.show({ title: 'Test' });
      });

      await waitFor(() => {
        expect(result.current.messages).toHaveLength(1);
      });

      act(() => {
        result.current.dismiss('non-existent-id');
      });

      // Should still have the message
      expect(result.current.messages).toHaveLength(1);
    });
  });

  describe('State Persistence', () => {
    it('should share state between multiple hook instances', async () => {
      const { result: result1 } = renderHook(() => toastStore());
      const { result: result2 } = renderHook(() => toastStore());

      act(() => {
        result1.current.show({ title: 'Shared Message' });
      });

      await waitFor(() => {
        expect(result1.current.messages).toHaveLength(1);
        expect(result2.current.messages).toHaveLength(1);
        expect(result1.current.messages[0].title).toBe('Shared Message');
        expect(result2.current.messages[0].title).toBe('Shared Message');
      });
    });
  });
});
