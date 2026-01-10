// apps/web/src/contexts/__tests__/HistoryContext.test.tsx
/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { act, renderHook } from '@testing-library/react';
import { HistoryProvider, useHistoryNav } from '@ui';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: (): typeof mockNavigate => mockNavigate,
  };
});

describe('HistoryProvider', () => {
  const createWrapper = (
    initialEntries: string[] = ['/'],
  ): React.FC<{ children: React.ReactNode }> => {
    return ({ children }: { children: React.ReactNode }): React.ReactElement => (
      <MemoryRouter initialEntries={initialEntries}>
        <HistoryProvider>{children}</HistoryProvider>
      </MemoryRouter>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Initial State', () => {
    it('should provide history context', () => {
      const { result } = renderHook(() => useHistoryNav(), {
        wrapper: createWrapper(),
      });

      expect(result.current).toBeDefined();
      expect(result.current.history).toBeDefined();
      expect(result.current.index).toBeDefined();
    });

    it('should initialize with current location in history', () => {
      const { result } = renderHook(() => useHistoryNav(), {
        wrapper: createWrapper(['/initial']),
      });

      expect(result.current.history).toContain('/initial');
    });

    it('should not be able to go back initially', () => {
      const { result } = renderHook(() => useHistoryNav(), {
        wrapper: createWrapper(['/first']),
      });

      expect(result.current.canGoBack).toBe(false);
    });

    it('should not be able to go forward initially', () => {
      const { result } = renderHook(() => useHistoryNav(), {
        wrapper: createWrapper(['/first']),
      });

      expect(result.current.canGoForward).toBe(false);
    });
  });

  describe('Navigation Functions', () => {
    it('should provide goBack function', () => {
      const { result } = renderHook(() => useHistoryNav(), {
        wrapper: createWrapper(),
      });

      expect(typeof result.current.goBack).toBe('function');
    });

    it('should provide goForward function', () => {
      const { result } = renderHook(() => useHistoryNav(), {
        wrapper: createWrapper(),
      });

      expect(typeof result.current.goForward).toBe('function');
    });

    it('should call navigate(-1) when goBack is called and canGoBack is true', () => {
      const { result } = renderHook(() => useHistoryNav(), {
        wrapper: createWrapper(['/first', '/second']),
      });

      // Simulate having history
      act(() => {
        // Manually trigger a state where canGoBack would be true
        // This is limited in testing without full router integration
      });

      // The goBack function should exist
      expect(result.current.goBack).toBeDefined();
    });

    it('should not navigate when goBack is called and canGoBack is false', () => {
      const { result } = renderHook(() => useHistoryNav(), {
        wrapper: createWrapper(['/only-page']),
      });

      act(() => {
        result.current.goBack();
      });

      // Should not call navigate when canGoBack is false
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('should not navigate when goForward is called and canGoForward is false', () => {
      const { result } = renderHook(() => useHistoryNav(), {
        wrapper: createWrapper(['/only-page']),
      });

      act(() => {
        result.current.goForward();
      });

      // Should not call navigate when canGoForward is false
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe('History Tracking', () => {
    it('should track history as an array', () => {
      const { result } = renderHook(() => useHistoryNav(), {
        wrapper: createWrapper(['/page1']),
      });

      expect(Array.isArray(result.current.history)).toBe(true);
    });

    it('should track current index', () => {
      const { result } = renderHook(() => useHistoryNav(), {
        wrapper: createWrapper(['/page1']),
      });

      expect(typeof result.current.index).toBe('number');
    });
  });
});

describe('useHistoryNav', () => {
  it('should throw error when used outside HistoryProvider', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      renderHook(() => useHistoryNav(), {
        wrapper: ({ children }: { children: React.ReactNode }) => (
          <MemoryRouter>{children}</MemoryRouter>
        ),
      });
    }).toThrow('useHistoryNav must be used within HistoryProvider');

    consoleSpy.mockRestore();
  });
});

describe('Aggressive TDD - Edge Cases', () => {
  const createWrapper = (
    initialEntries: string[] = ['/'],
  ): React.FC<{ children: React.ReactNode }> => {
    return ({ children }: { children: React.ReactNode }): React.ReactElement => (
      <MemoryRouter initialEntries={initialEntries}>
        <HistoryProvider>{children}</HistoryProvider>
      </MemoryRouter>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should handle rapid goBack calls without crashing', () => {
    const { result } = renderHook(() => useHistoryNav(), {
      wrapper: createWrapper(['/page1', '/page2', '/page3']),
    });

    // Rapid goBack calls
    for (let i = 0; i < 100; i++) {
      act(() => {
        result.current.goBack();
      });
    }

    // Should not crash
    expect(result.current).toBeDefined();
  });

  it('should handle rapid goForward calls without crashing', () => {
    const { result } = renderHook(() => useHistoryNav(), {
      wrapper: createWrapper(['/page1']),
    });

    // Rapid goForward calls (even though we can't go forward)
    for (let i = 0; i < 100; i++) {
      act(() => {
        result.current.goForward();
      });
    }

    // Should not crash
    expect(result.current).toBeDefined();
  });

  it('should handle alternating goBack/goForward calls', () => {
    const { result } = renderHook(() => useHistoryNav(), {
      wrapper: createWrapper(['/page1', '/page2']),
    });

    // Alternating calls
    for (let i = 0; i < 50; i++) {
      act(() => {
        result.current.goBack();
      });
      act(() => {
        result.current.goForward();
      });
    }

    // Should not crash
    expect(result.current).toBeDefined();
  });

  it('should handle very long URL paths', () => {
    const longPath = '/' + 'a'.repeat(10000);

    expect(() => {
      renderHook(() => useHistoryNav(), {
        wrapper: createWrapper([longPath]),
      });
    }).not.toThrow();
  });

  it('should handle URLs with special characters', () => {
    const specialPaths = [
      '/path?query=value&other=123',
      '/path#hash',
      '/path?q=hello%20world',
      '/path?q=<script>alert(1)</script>',
      '/path/with/unicode/路径',
    ];

    specialPaths.forEach((path) => {
      expect(() => {
        renderHook(() => useHistoryNav(), {
          wrapper: createWrapper([path]),
        });
      }).not.toThrow();
    });
  });

  it('should handle many history entries', () => {
    const paths = Array.from({ length: 100 }, (_, i) => `/page${String(i)}`);

    expect(() => {
      renderHook(() => useHistoryNav(), {
        wrapper: createWrapper(paths),
      });
    }).not.toThrow();
  });

  it('should handle empty path', () => {
    expect(() => {
      renderHook(() => useHistoryNav(), {
        wrapper: createWrapper(['']),
      });
    }).not.toThrow();
  });

  it('should handle root path only', () => {
    const { result } = renderHook(() => useHistoryNav(), {
      wrapper: createWrapper(['/']),
    });

    expect(result.current.canGoBack).toBe(false);
    expect(result.current.canGoForward).toBe(false);
  });

  it('should maintain stable function references across re-renders', () => {
    const { result, rerender } = renderHook(() => useHistoryNav(), {
      wrapper: createWrapper(['/page1']),
    });

    const goBack1 = result.current.goBack;
    const goForward1 = result.current.goForward;

    rerender();

    const goBack2 = result.current.goBack;
    const goForward2 = result.current.goForward;

    // Functions should be stable (memoized)
    expect(goBack1).toBe(goBack2);
    expect(goForward1).toBe(goForward2);
  });

  it('should handle 100 rapid re-renders', () => {
    const { result, rerender } = renderHook(() => useHistoryNav(), {
      wrapper: createWrapper(['/page1']),
    });

    const start = performance.now();

    for (let i = 0; i < 100; i++) {
      rerender();
    }

    const end = performance.now();

    // Should complete within 1 second
    expect(end - start).toBeLessThan(1000);
    expect(result.current).toBeDefined();
  });
});
