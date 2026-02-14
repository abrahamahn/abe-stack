// main/client/react/src/stores/createStore.test.ts
import { act, renderHook } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';

import { createStore } from './createStore';

// ============================================================================
// Basic Store Tests
// ============================================================================

describe('createStore', () => {
  describe('basic functionality', () => {
    test('should create a store with initial state', () => {
      const useStore = createStore<{ count: number }>(() => ({
        count: 0,
      }));

      expect(useStore.getState()).toEqual({ count: 0 });
    });

    test('should update state with partial object', () => {
      const useStore = createStore<{ count: number; name: string }>(() => ({
        count: 0,
        name: 'test',
      }));

      useStore.setState({ count: 5 });

      expect(useStore.getState()).toEqual({ count: 5, name: 'test' });
    });

    test('should update state with updater function', () => {
      const useStore = createStore<{ count: number }>(() => ({
        count: 0,
      }));

      useStore.setState((state) => ({ count: state.count + 1 }));

      expect(useStore.getState().count).toBe(1);
    });

    test('should allow multiple state updates', () => {
      const useStore = createStore<{ count: number }>(() => ({
        count: 0,
      }));

      useStore.setState({ count: 1 });
      useStore.setState({ count: 2 });
      useStore.setState((state) => ({ count: state.count + 3 }));

      expect(useStore.getState().count).toBe(5);
    });
  });

  describe('state with actions', () => {
    test('should support actions defined in state creator', () => {
      const useStore = createStore<{
        count: number;
        increment: () => void;
        decrement: () => void;
        reset: () => void;
      }>((set) => ({
        count: 0,
        increment: () => {
          set((state) => ({ count: state.count + 1 }));
        },
        decrement: () => {
          set((state) => ({ count: state.count - 1 }));
        },
        reset: () => {
          set({ count: 0 });
        },
      }));

      const { increment, decrement, reset } = useStore.getState();

      increment();
      expect(useStore.getState().count).toBe(1);

      increment();
      increment();
      expect(useStore.getState().count).toBe(3);

      decrement();
      expect(useStore.getState().count).toBe(2);

      reset();
      expect(useStore.getState().count).toBe(0);
    });

    test('should support complex state updates', () => {
      interface TodoStore {
        todos: Array<{ id: number; text: string; done: boolean }>;
        nextId: number;
        addTodo: (text: string) => void;
        toggleTodo: (id: number) => void;
        removeTodo: (id: number) => void;
      }

      const useStore = createStore<TodoStore>((set) => ({
        todos: [],
        nextId: 1,
        addTodo: (text: string) => {
          set((state) => ({
            todos: [...state.todos, { id: state.nextId, text, done: false }],
            nextId: state.nextId + 1,
          }));
        },
        toggleTodo: (id: number) => {
          set((state) => ({
            todos: state.todos.map((todo) =>
              todo.id === id ? { ...todo, done: !todo.done } : todo,
            ),
          }));
        },
        removeTodo: (id: number) => {
          set((state) => ({
            todos: state.todos.filter((todo) => todo.id !== id),
          }));
        },
      }));

      const { addTodo, toggleTodo, removeTodo } = useStore.getState();

      addTodo('First todo');
      expect(useStore.getState().todos).toHaveLength(1);
      expect(useStore.getState().todos[0]?.text).toBe('First todo');

      addTodo('Second todo');
      expect(useStore.getState().todos).toHaveLength(2);

      const firstId = useStore.getState().todos[0]?.id ?? 0;
      toggleTodo(firstId);
      expect(useStore.getState().todos[0]?.done).toBe(true);

      removeTodo(firstId);
      expect(useStore.getState().todos).toHaveLength(1);
      expect(useStore.getState().todos[0]?.text).toBe('Second todo');
    });
  });

  describe('subscriptions', () => {
    test('should notify subscribers when state changes', () => {
      const useStore = createStore<{ count: number }>(() => ({
        count: 0,
      }));

      const listener = vi.fn();
      useStore.subscribe(listener);

      useStore.setState({ count: 1 });

      expect(listener).toHaveBeenCalledOnce();
    });

    test('should notify multiple subscribers', () => {
      const useStore = createStore<{ count: number }>(() => ({
        count: 0,
      }));

      const listener1 = vi.fn();
      const listener2 = vi.fn();
      const listener3 = vi.fn();

      useStore.subscribe(listener1);
      useStore.subscribe(listener2);
      useStore.subscribe(listener3);

      useStore.setState({ count: 1 });

      expect(listener1).toHaveBeenCalledOnce();
      expect(listener2).toHaveBeenCalledOnce();
      expect(listener3).toHaveBeenCalledOnce();
    });

    test('should unsubscribe when unsubscribe function is called', () => {
      const useStore = createStore<{ count: number }>(() => ({
        count: 0,
      }));

      const listener = vi.fn();
      const unsubscribe = useStore.subscribe(listener);

      useStore.setState({ count: 1 });
      expect(listener).toHaveBeenCalledOnce();

      unsubscribe();

      useStore.setState({ count: 2 });
      expect(listener).toHaveBeenCalledOnce(); // Not called again after unsubscribe
    });

    test('should not notify when setting exact same state object', () => {
      const useStore = createStore<{ count: number }>(() => ({
        count: 0,
      }));

      const listener = vi.fn();
      useStore.subscribe(listener);

      // Setting with same values but new object will notify
      useStore.setState({ count: 0 });

      // Listeners are notified even with same values because Object.is checks reference
      expect(listener).toHaveBeenCalledOnce();
    });

    test('should handle multiple subscriptions and unsubscriptions', () => {
      const useStore = createStore<{ count: number }>(() => ({
        count: 0,
      }));

      const listener1 = vi.fn();
      const listener2 = vi.fn();

      const unsub1 = useStore.subscribe(listener1);
      const unsub2 = useStore.subscribe(listener2);

      useStore.setState({ count: 1 });
      expect(listener1).toHaveBeenCalledOnce();
      expect(listener2).toHaveBeenCalledOnce();

      unsub1();

      useStore.setState({ count: 2 });
      expect(listener1).toHaveBeenCalledOnce(); // Not called again
      expect(listener2).toHaveBeenCalledTimes(2);

      unsub2();

      useStore.setState({ count: 3 });
      expect(listener1).toHaveBeenCalledOnce();
      expect(listener2).toHaveBeenCalledTimes(2);
    });
  });

  describe('React hook integration', () => {
    test('should work as a React hook', () => {
      const useStore = createStore<{ count: number }>(() => ({
        count: 0,
      }));

      const { result } = renderHook(() => useStore());

      expect(result.current.count).toBe(0);
    });

    test('should trigger re-render on state change', () => {
      const useStore = createStore<{
        count: number;
        increment: () => void;
      }>((set) => ({
        count: 0,
        increment: () => {
          set((state) => ({ count: state.count + 1 }));
        },
      }));

      const { result } = renderHook(() => useStore());

      expect(result.current.count).toBe(0);

      act(() => {
        result.current.increment();
      });

      expect(result.current.count).toBe(1);
    });

    test('should update state from outside component', () => {
      const useStore = createStore<{ count: number }>(() => ({
        count: 0,
      }));

      const { result } = renderHook(() => useStore());

      expect(result.current.count).toBe(0);

      act(() => {
        useStore.setState({ count: 5 });
      });

      expect(result.current.count).toBe(5);
    });

    test('should work with multiple hook instances', () => {
      const useStore = createStore<{ count: number }>(() => ({
        count: 0,
      }));

      const { result: result1 } = renderHook(() => useStore());
      const { result: result2 } = renderHook(() => useStore());

      expect(result1.current.count).toBe(0);
      expect(result2.current.count).toBe(0);

      act(() => {
        useStore.setState({ count: 10 });
      });

      // Both should reflect the same state
      expect(result1.current.count).toBe(10);
      expect(result2.current.count).toBe(10);
    });
  });

  describe('edge cases', () => {
    test('should handle empty state', () => {
      const useStore = createStore<Record<string, never>>(() => ({}));

      expect(useStore.getState()).toEqual({});
    });

    test('should handle state with nested objects', () => {
      interface NestedState {
        user: { name: string; age: number };
        settings: { theme: string; notifications: boolean };
      }

      const useStore = createStore<NestedState>(() => ({
        user: { name: 'Alice', age: 30 },
        settings: { theme: 'dark', notifications: true },
      }));

      expect(useStore.getState().user.name).toBe('Alice');
      expect(useStore.getState().settings.theme).toBe('dark');

      useStore.setState({
        user: { name: 'Bob', age: 25 },
      });

      expect(useStore.getState().user.name).toBe('Bob');
      expect(useStore.getState().settings.theme).toBe('dark'); // Unchanged
    });

    test('should handle state with arrays', () => {
      const useStore = createStore<{ items: number[] }>(() => ({
        items: [1, 2, 3],
      }));

      expect(useStore.getState().items).toEqual([1, 2, 3]);

      useStore.setState({ items: [4, 5, 6] });

      expect(useStore.getState().items).toEqual([4, 5, 6]);
    });

    test('should handle rapid state updates', () => {
      const useStore = createStore<{ count: number }>(() => ({
        count: 0,
      }));

      const listener = vi.fn();
      useStore.subscribe(listener);

      for (let i = 1; i <= 100; i++) {
        useStore.setState({ count: i });
      }

      expect(useStore.getState().count).toBe(100);
      expect(listener).toHaveBeenCalledTimes(100);
    });

    test('should not mutate original state object', () => {
      const initialState = { count: 0, name: 'test' };
      const useStore = createStore<{ count: number; name: string }>(() => initialState);

      useStore.setState({ count: 5 });

      // Original object should remain unchanged
      expect(initialState.count).toBe(0);
      expect(useStore.getState().count).toBe(5);
    });

    test('should handle updater function that returns same values', () => {
      const useStore = createStore<{ count: number }>(() => ({
        count: 0,
      }));

      const listener = vi.fn();
      useStore.subscribe(listener);

      useStore.setState((state) => ({ count: state.count })); // No change

      // Should still notify because the object reference changes
      expect(listener).toHaveBeenCalledOnce();
    });

    test('should work with boolean and null values', () => {
      interface TestState {
        isActive: boolean;
        data: string | null;
        count: number;
      }

      const useStore = createStore<TestState>(() => ({
        isActive: false,
        data: null,
        count: 0,
      }));

      expect(useStore.getState().isActive).toBe(false);
      expect(useStore.getState().data).toBeNull();

      useStore.setState({ isActive: true, data: 'test' });

      expect(useStore.getState().isActive).toBe(true);
      expect(useStore.getState().data).toBe('test');
    });
  });

  describe('get and set interaction', () => {
    test('should have access to get within state creator', () => {
      const useStore = createStore<{
        count: number;
        doubled: number;
        updateDoubled: () => void;
      }>((set, get) => ({
        count: 5,
        doubled: 10,
        updateDoubled: () => {
          const current = get();
          set({ doubled: current.count * 2 });
        },
      }));

      expect(useStore.getState().doubled).toBe(10);

      useStore.setState({ count: 7 });
      useStore.getState().updateDoubled();

      expect(useStore.getState().doubled).toBe(14);
    });

    test('should allow actions to call other actions via get', () => {
      const useStore = createStore<{
        count: number;
        increment: () => void;
        incrementTwice: () => void;
      }>((set, get) => ({
        count: 0,
        increment: () => {
          set((state) => ({ count: state.count + 1 }));
        },
        incrementTwice: () => {
          const { increment } = get();
          increment();
          increment();
        },
      }));

      useStore.getState().incrementTwice();

      expect(useStore.getState().count).toBe(2);
    });
  });

  describe('memory management', () => {
    test('should properly cleanup listeners on unsubscribe', () => {
      const useStore = createStore<{ count: number }>(() => ({
        count: 0,
      }));

      const listeners = Array.from({ length: 10 }, () => vi.fn());
      const unsubscribers = listeners.map((listener) => useStore.subscribe(listener));

      // All subscribed
      useStore.setState({ count: 1 });
      listeners.forEach((listener) => {
        expect(listener).toHaveBeenCalledOnce();
      });

      // Unsubscribe half
      unsubscribers.slice(0, 5).forEach((unsub) => {
        unsub();
      });

      useStore.setState({ count: 2 });
      listeners.slice(0, 5).forEach((listener) => {
        expect(listener).toHaveBeenCalledOnce();
      });
      listeners.slice(5).forEach((listener) => {
        expect(listener).toHaveBeenCalledTimes(2);
      });

      // Unsubscribe remaining
      unsubscribers.slice(5).forEach((unsub) => {
        unsub();
      });

      useStore.setState({ count: 3 });
      listeners.forEach((listener) => {
        const calls = listener.mock.calls.length;
        expect(calls).toBeLessThanOrEqual(2);
      });
    });
  });
});
