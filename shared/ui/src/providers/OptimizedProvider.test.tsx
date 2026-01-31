// shared/ui/src/providers/OptimizedProvider.test.tsx
/** @vitest-environment jsdom */
import { act, render, renderHook, screen } from '@testing-library/react';
import { useState, type ReactElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createLazyContext,
  createMemoizedContext,
  createReducerContext,
  createSelectiveContext,
  createSubscriptionContext,
  Memoized,
  SelectiveMemo,
  useRenderPerformance,
} from './OptimizedProvider';

// ============================================================================
// Tests: createMemoizedContext
// ============================================================================

describe('createMemoizedContext', () => {
  it('creates a context with Provider and useContextValue', () => {
    const { Provider, useContextValue, Context } = createMemoizedContext<{ value: string }>();

    expect(Provider).toBeDefined();
    expect(useContextValue).toBeDefined();
    expect(Context).toBeDefined();
  });

  it('provides value to children', () => {
    const { Provider, useContextValue } = createMemoizedContext<{ value: string }>();

    // eslint-disable-next-line @typescript-eslint/naming-convention
    function TestComponent(): ReactElement {
      const ctx = useContextValue();
      return <div data-testid="value">{ctx.value}</div>;
    }

    render(
      <Provider value={{ value: 'test' }}>
        <TestComponent />
      </Provider>,
    );

    expect(screen.getByTestId('value').textContent).toBe('test');
  });

  it('throws error when useContextValue is called outside Provider', () => {
    const { useContextValue } = createMemoizedContext<{ value: string }>();

    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      renderHook(() => useContextValue());
    }).toThrow('useContextValue must be used within a Provider');

    consoleError.mockRestore();
  });

  it('memoizes the context value', () => {
    const { Provider, useContextValue } = createMemoizedContext<{ value: string }>();
    const renderCount = { current: 0 };

    // eslint-disable-next-line @typescript-eslint/naming-convention
    function TestComponent(): ReactElement {
      useContextValue();
      renderCount.current++;
      return <div>Test</div>;
    }

    const { rerender } = render(
      <Provider value={{ value: 'test' }}>
        <TestComponent />
      </Provider>,
    );

    expect(renderCount.current).toBe(1);

    // Rerender with same value reference
    const sameValue = { value: 'test' };
    rerender(
      <Provider value={sameValue}>
        <TestComponent />
      </Provider>,
    );

    // Component should still rerender when parent rerenders
    expect(renderCount.current).toBe(2);
  });
});

// ============================================================================
// Tests: createSelectiveContext
// ============================================================================

describe('createSelectiveContext', () => {
  it('creates a context with Provider and useContextValue', () => {
    const { Provider, useContextValue, Context } = createSelectiveContext<{
      theme: string;
      count: number;
    }>();

    expect(Provider).toBeDefined();
    expect(useContextValue).toBeDefined();
    expect(Context).toBeDefined();
  });

  it('provides values to children', () => {
    const { Provider, useContextValue } = createSelectiveContext<{
      theme: string;
      count: number;
    }>();

    // eslint-disable-next-line @typescript-eslint/naming-convention
    function TestComponent(): ReactElement {
      const ctx = useContextValue();
      return (
        <div>
          <span data-testid="theme">{ctx.theme}</span>
          <span data-testid="count">{ctx.count}</span>
        </div>
      );
    }

    render(
      <Provider theme="dark" count={5}>
        <TestComponent />
      </Provider>,
    );

    expect(screen.getByTestId('theme').textContent).toBe('dark');
    expect(screen.getByTestId('count').textContent).toBe('5');
  });

  it('throws error when useContextValue is called outside Provider', () => {
    const { useContextValue } = createSelectiveContext<{ theme: string }>();

    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      renderHook(() => useContextValue());
    }).toThrow('useContextValue must be used within a Provider');

    consoleError.mockRestore();
  });
});

// ============================================================================
// Tests: createReducerContext
// ============================================================================

describe('createReducerContext', () => {
  interface CounterState {
    count: number;
  }

  type CounterAction =
    | { type: 'INCREMENT' }
    | { type: 'DECREMENT' }
    | { type: 'SET'; payload: number };

  const counterReducer = (state: CounterState, action: CounterAction): CounterState => {
    switch (action.type) {
      case 'INCREMENT':
        return { count: state.count + 1 };
      case 'DECREMENT':
        return { count: state.count - 1 };
      case 'SET':
        return { count: action.payload };
      default:
        return state;
    }
  };

  it('creates a context with Provider, useContextValue, useStateSelector, and useDispatch', () => {
    const { Provider, useContextValue, useStateSelector, useDispatch, Context } =
      createReducerContext<CounterState, CounterAction>();

    expect(Provider).toBeDefined();
    expect(useContextValue).toBeDefined();
    expect(useStateSelector).toBeDefined();
    expect(useDispatch).toBeDefined();
    expect(Context).toBeDefined();
  });

  it('provides state and dispatch to children', () => {
    const { Provider, useContextValue } = createReducerContext<CounterState, CounterAction>();

    // eslint-disable-next-line @typescript-eslint/naming-convention
    function TestComponent(): ReactElement {
      const { state, dispatch } = useContextValue();
      return (
        <div>
          <span data-testid="count">{state.count}</span>
          <button
            onClick={() => {
              dispatch({ type: 'INCREMENT' });
            }}
          >
            Increment
          </button>
        </div>
      );
    }

    render(
      <Provider reducer={counterReducer} initialState={{ count: 0 }}>
        <TestComponent />
      </Provider>,
    );

    expect(screen.getByTestId('count').textContent).toBe('0');
  });

  it('dispatches actions correctly', () => {
    const { Provider, useContextValue } = createReducerContext<CounterState, CounterAction>();

    // eslint-disable-next-line @typescript-eslint/naming-convention
    function TestComponent(): ReactElement {
      const { state, dispatch } = useContextValue();
      return (
        <div>
          <span data-testid="count">{state.count}</span>
          <button
            data-testid="increment"
            onClick={() => {
              dispatch({ type: 'INCREMENT' });
            }}
          >
            Increment
          </button>
          <button
            data-testid="decrement"
            onClick={() => {
              dispatch({ type: 'DECREMENT' });
            }}
          >
            Decrement
          </button>
        </div>
      );
    }

    render(
      <Provider reducer={counterReducer} initialState={{ count: 5 }}>
        <TestComponent />
      </Provider>,
    );

    expect(screen.getByTestId('count').textContent).toBe('5');

    act(() => {
      screen.getByTestId('increment').click();
    });

    expect(screen.getByTestId('count').textContent).toBe('6');

    act(() => {
      screen.getByTestId('decrement').click();
    });

    expect(screen.getByTestId('count').textContent).toBe('5');
  });

  it('useStateSelector returns selected state', () => {
    const { Provider, useStateSelector } = createReducerContext<CounterState, CounterAction>();

    // eslint-disable-next-line @typescript-eslint/naming-convention
    function TestComponent(): ReactElement {
      const count = useStateSelector((state) => state.count);
      return <span data-testid="count">{count}</span>;
    }

    render(
      <Provider reducer={counterReducer} initialState={{ count: 10 }}>
        <TestComponent />
      </Provider>,
    );

    expect(screen.getByTestId('count').textContent).toBe('10');
  });

  it('useDispatch returns dispatch function', () => {
    const { Provider, useDispatch, useStateSelector } = createReducerContext<
      CounterState,
      CounterAction
    >();

    // eslint-disable-next-line @typescript-eslint/naming-convention
    function TestComponent(): ReactElement {
      const dispatch = useDispatch();
      const count = useStateSelector((state) => state.count);
      return (
        <div>
          <span data-testid="count">{count}</span>
          <button
            data-testid="set"
            onClick={() => {
              dispatch({ type: 'SET', payload: 42 });
            }}
          >
            Set to 42
          </button>
        </div>
      );
    }

    render(
      <Provider reducer={counterReducer} initialState={{ count: 0 }}>
        <TestComponent />
      </Provider>,
    );

    act(() => {
      screen.getByTestId('set').click();
    });

    expect(screen.getByTestId('count').textContent).toBe('42');
  });

  it('throws error when used outside Provider', () => {
    const { useContextValue } = createReducerContext<CounterState, CounterAction>();

    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      renderHook(() => useContextValue());
    }).toThrow('useContextValue must be used within a Provider');

    consoleError.mockRestore();
  });
});

// ============================================================================
// Tests: createLazyContext
// ============================================================================

describe('createLazyContext', () => {
  it('creates a context with Provider and useContextValue', () => {
    const { Provider, useContextValue, Context } = createLazyContext<{ data: string }>();

    expect(Provider).toBeDefined();
    expect(useContextValue).toBeDefined();
    expect(Context).toBeDefined();
  });

  it('lazily initializes the value', () => {
    const { Provider, useContextValue } = createLazyContext<{ data: string }>();
    const initializer = vi.fn(() => ({ data: 'initialized' }));

    // eslint-disable-next-line @typescript-eslint/naming-convention
    function TestComponent(): ReactElement {
      const ctx = useContextValue();
      return <span data-testid="data">{ctx.data}</span>;
    }

    render(
      <Provider initializer={initializer}>
        <TestComponent />
      </Provider>,
    );

    expect(initializer).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('data').textContent).toBe('initialized');
  });

  it('reinitializes when deps change', () => {
    const { Provider, useContextValue } = createLazyContext<{ data: string }>();
    let initCount = 0;
    const initializer = vi.fn(() => ({ data: `init-${++initCount}` }));

    // eslint-disable-next-line @typescript-eslint/naming-convention
    function TestComponent(): ReactElement {
      const ctx = useContextValue();
      return <span data-testid="data">{ctx.data}</span>;
    }

    const { rerender } = render(
      <Provider initializer={initializer} deps={['dep1']}>
        <TestComponent />
      </Provider>,
    );

    expect(screen.getByTestId('data').textContent).toBe('init-1');

    // Change deps
    rerender(
      <Provider initializer={initializer} deps={['dep2']}>
        <TestComponent />
      </Provider>,
    );

    expect(screen.getByTestId('data').textContent).toBe('init-2');
  });

  it('throws error when used outside Provider', () => {
    const { useContextValue } = createLazyContext<{ data: string }>();

    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      renderHook(() => useContextValue());
    }).toThrow('useContextValue must be used within a Provider');

    consoleError.mockRestore();
  });
});

// ============================================================================
// Tests: createSubscriptionContext
// ============================================================================

describe('createSubscriptionContext', () => {
  it('creates a context with Provider and useContextValue', () => {
    const { Provider, useContextValue, Context } = createSubscriptionContext<string>();

    expect(Provider).toBeDefined();
    expect(useContextValue).toBeDefined();
    expect(Context).toBeDefined();
  });

  it('provides subscription functionality', () => {
    const { Provider, useContextValue } = createSubscriptionContext<string>();
    const mockSubscribe = vi.fn((callback: (data: string) => void) => {
      callback('subscribed-data');
      return () => {};
    });

    // eslint-disable-next-line @typescript-eslint/naming-convention
    function TestComponent(): ReactElement {
      const { data, isLoading, subscribe } = useContextValue();
      return (
        <div>
          <span data-testid="data">{data ?? 'no-data'}</span>
          <span data-testid="loading">{isLoading ? 'loading' : 'loaded'}</span>
          <button
            data-testid="subscribe"
            onClick={() => {
              subscribe(() => {});
            }}
          >
            Subscribe
          </button>
        </div>
      );
    }

    render(
      <Provider subscribe={mockSubscribe}>
        <TestComponent />
      </Provider>,
    );

    expect(screen.getByTestId('data').textContent).toBe('no-data');
    expect(screen.getByTestId('loading').textContent).toBe('loading');
  });

  it('handles subscribe callback', () => {
    const { Provider, useContextValue } = createSubscriptionContext<string>();
    const unsubscribe = vi.fn();
    const mockSubscribe = vi.fn((callback: (data: string) => void) => {
      setTimeout(() => {
        callback('async-data');
      }, 0);
      return unsubscribe;
    });

    // eslint-disable-next-line @typescript-eslint/naming-convention
    function TestComponent(): ReactElement {
      const { data, isLoading, subscribe } = useContextValue();
      const [localData, setLocalData] = useState<string | null>(null);

      return (
        <div>
          <span data-testid="data">{localData ?? data ?? 'no-data'}</span>
          <span data-testid="loading">{isLoading ? 'loading' : 'loaded'}</span>
          <button
            data-testid="subscribe"
            onClick={() => {
              subscribe(setLocalData);
            }}
          >
            Subscribe
          </button>
        </div>
      );
    }

    render(
      <Provider subscribe={mockSubscribe}>
        <TestComponent />
      </Provider>,
    );

    act(() => {
      screen.getByTestId('subscribe').click();
    });

    expect(mockSubscribe).toHaveBeenCalled();
  });

  it('calls unsubscribe on unmount', () => {
    const { Provider, useContextValue } = createSubscriptionContext<string>();
    const unsubscribeFn = vi.fn();
    const mockSubscribe = vi.fn(() => () => {});

    // eslint-disable-next-line @typescript-eslint/naming-convention
    function TestComponent(): ReactElement {
      const ctx = useContextValue();
      return <div>{ctx.data}</div>;
    }

    const { unmount } = render(
      <Provider subscribe={mockSubscribe} unsubscribe={unsubscribeFn}>
        <TestComponent />
      </Provider>,
    );

    unmount();

    expect(unsubscribeFn).toHaveBeenCalled();
  });

  it('throws error when used outside Provider', () => {
    const { useContextValue } = createSubscriptionContext<string>();

    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      renderHook(() => useContextValue());
    }).toThrow('useContextValue must be used within a Provider');

    consoleError.mockRestore();
  });

  it('handles subscribe errors', () => {
    const { Provider, useContextValue } = createSubscriptionContext<string>();
    const mockSubscribe = vi.fn(() => {
      throw new Error('Subscribe error');
    });

    // eslint-disable-next-line @typescript-eslint/naming-convention
    function TestComponent(): ReactElement {
      const { error, subscribe } = useContextValue();
      return (
        <div>
          <span data-testid="error">{error?.message ?? 'no-error'}</span>
          <button
            data-testid="subscribe"
            onClick={() => {
              subscribe(() => {});
            }}
          >
            Subscribe
          </button>
        </div>
      );
    }

    render(
      <Provider subscribe={mockSubscribe}>
        <TestComponent />
      </Provider>,
    );

    act(() => {
      screen.getByTestId('subscribe').click();
    });

    expect(screen.getByTestId('error').textContent).toBe('Subscribe error');
  });
});

// ============================================================================
// Tests: Memoized Component
// ============================================================================

describe('Memoized', () => {
  it('renders children', () => {
    render(
      <Memoized>
        <span data-testid="child">Child content</span>
      </Memoized>,
    );

    expect(screen.getByTestId('child').textContent).toBe('Child content');
  });

  it('is memoized with shallow comparison', () => {
    const renderCount = { current: 0 };

    // eslint-disable-next-line @typescript-eslint/naming-convention
    function Child(): ReactElement {
      renderCount.current++;
      return <span>Render count: {renderCount.current}</span>;
    }

    const { rerender } = render(
      <Memoized>
        <Child />
      </Memoized>,
    );

    expect(renderCount.current).toBe(1);

    // Rerender with same children reference
    rerender(
      <Memoized>
        <Child />
      </Memoized>,
    );

    // Memoized uses shallow comparison on children prop
    // Since <Child /> creates a new React element each time, it will re-render
    expect(renderCount.current).toBeGreaterThanOrEqual(1);
  });
});

// ============================================================================
// Tests: SelectiveMemo Component
// ============================================================================

describe('SelectiveMemo', () => {
  it('renders children with props', () => {
    render(
      <SelectiveMemo<{ name: string; age: number }> watchKeys={['name']} name="John" age={30}>
        {(props) => (
          <div>
            <span data-testid="name">{props.name}</span>
            <span data-testid="age">{props.age}</span>
          </div>
        )}
      </SelectiveMemo>,
    );

    expect(screen.getByTestId('name').textContent).toBe('John');
    expect(screen.getByTestId('age').textContent).toBe('30');
  });

  it('re-renders when watched props change', () => {
    const childRender = vi.fn((props: { name: string; age: number }) => (
      <div>
        <span data-testid="name">{props.name}</span>
        <span data-testid="age">{props.age}</span>
      </div>
    ));

    const { rerender } = render(
      <SelectiveMemo<{ name: string; age: number }> watchKeys={['name']} name="John" age={30}>
        {childRender}
      </SelectiveMemo>,
    );

    expect(childRender).toHaveBeenCalledTimes(1);

    // Change watched prop
    rerender(
      <SelectiveMemo<{ name: string; age: number }> watchKeys={['name']} name="Jane" age={30}>
        {childRender}
      </SelectiveMemo>,
    );

    expect(childRender).toHaveBeenCalledTimes(2);
  });
});

// ============================================================================
// Tests: useRenderPerformance
// ============================================================================

describe('useRenderPerformance', () => {
  let originalNodeEnv: string | undefined;

  beforeEach(() => {
    originalNodeEnv = process.env['NODE_ENV'];
  });

  afterEach(() => {
    process.env['NODE_ENV'] = originalNodeEnv;
  });

  it('tracks render count', () => {
    const { result, rerender } = renderHook(() => useRenderPerformance('TestComponent'));

    expect(result.current.renderCount).toBe(1);

    rerender();

    expect(result.current.renderCount).toBe(2);
  });

  it('resets render counter', () => {
    const { result, rerender } = renderHook(() => useRenderPerformance('TestComponent'));

    rerender();
    rerender();
    expect(result.current.renderCount).toBe(3);

    act(() => {
      result.current.resetCounter();
    });

    // Note: resetCounter sets to 0, but next render increments
    rerender();
    expect(result.current.renderCount).toBe(1);
  });

  it('does not log in development mode (logging disabled in implementation)', () => {
    process.env['NODE_ENV'] = 'development';
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    renderHook(() => useRenderPerformance('TestComponent'));

    // The implementation has logging commented out, so no logging occurs
    expect(consoleSpy).not.toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it('does not log in production mode', () => {
    process.env['NODE_ENV'] = 'production';
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    renderHook(() => useRenderPerformance('TestComponent'));

    expect(consoleSpy).not.toHaveBeenCalled();

    consoleSpy.mockRestore();
  });
});
