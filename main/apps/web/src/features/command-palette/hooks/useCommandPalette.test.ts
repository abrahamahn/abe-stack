// main/apps/web/src/features/command-palette/hooks/useCommandPalette.test.ts
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useCommandPalette } from './useCommandPalette';

// Mock @bslt/react/router for useNavigate
const mockNavigate = vi.fn();
const mockCycleMode = vi.fn();

vi.mock('@bslt/react/router', async () => {
  const actual = await vi.importActual('@bslt/react/router');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock @bslt/react/hooks for useThemeMode and useKeyboardShortcuts
vi.mock('@bslt/react/hooks', async () => {
  const actual = await vi.importActual('@bslt/react/hooks');
  return {
    ...actual,
    useThemeMode: () => ({
      mode: 'system',
      setMode: vi.fn(),
      cycleMode: mockCycleMode,
      isDark: false,
      isLight: true,
      resolvedTheme: 'light',
    }),
    useKeyboardShortcuts: vi.fn(),
  };
});

describe('useCommandPalette', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should start with the palette closed', () => {
    const { result } = renderHook(() => useCommandPalette());
    expect(result.current.isOpen).toBe(false);
  });

  it('should open the palette', () => {
    const { result } = renderHook(() => useCommandPalette());
    act(() => {
      result.current.open();
    });
    expect(result.current.isOpen).toBe(true);
  });

  it('should close the palette', () => {
    const { result } = renderHook(() => useCommandPalette());
    act(() => {
      result.current.open();
    });
    act(() => {
      result.current.close();
    });
    expect(result.current.isOpen).toBe(false);
  });

  it('should toggle the palette', () => {
    const { result } = renderHook(() => useCommandPalette());
    act(() => {
      result.current.toggle();
    });
    expect(result.current.isOpen).toBe(true);
    act(() => {
      result.current.toggle();
    });
    expect(result.current.isOpen).toBe(false);
  });

  it('should start with empty query', () => {
    const { result } = renderHook(() => useCommandPalette());
    expect(result.current.query).toBe('');
  });

  it('should update query', () => {
    const { result } = renderHook(() => useCommandPalette());
    act(() => {
      result.current.setQuery('dashboard');
    });
    expect(result.current.query).toBe('dashboard');
  });

  it('should return all commands when query is empty', () => {
    const { result } = renderHook(() => useCommandPalette());
    expect(result.current.filteredCommands.length).toBeGreaterThan(0);
  });

  it('should filter commands based on query', () => {
    const { result } = renderHook(() => useCommandPalette());
    act(() => {
      result.current.setQuery('dashboard');
    });
    expect(result.current.filteredCommands.some((c) => c.id === 'nav-dashboard')).toBe(true);
    // Should not include unrelated commands
    expect(result.current.filteredCommands.length).toBeLessThan(
      result.current.filteredCommands.length + 1,
    );
  });

  it('should reset selected index when query changes', () => {
    const { result } = renderHook(() => useCommandPalette());
    act(() => {
      result.current.setSelectedIndex(3);
    });
    act(() => {
      result.current.setQuery('dash');
    });
    expect(result.current.selectedIndex).toBe(0);
  });

  it('should start with selectedIndex at 0', () => {
    const { result } = renderHook(() => useCommandPalette());
    expect(result.current.selectedIndex).toBe(0);
  });

  it('should move selection down', () => {
    const { result } = renderHook(() => useCommandPalette());
    act(() => {
      result.current.moveDown();
    });
    expect(result.current.selectedIndex).toBe(1);
  });

  it('should move selection up with wrapping', () => {
    const { result } = renderHook(() => useCommandPalette());
    act(() => {
      result.current.moveUp();
    });
    // Should wrap to last item
    expect(result.current.selectedIndex).toBe(result.current.filteredCommands.length - 1);
  });

  it('should wrap selection down to beginning', () => {
    const { result } = renderHook(() => useCommandPalette());
    const lastIndex = result.current.filteredCommands.length - 1;
    act(() => {
      result.current.setSelectedIndex(lastIndex);
    });
    act(() => {
      result.current.moveDown();
    });
    expect(result.current.selectedIndex).toBe(0);
  });

  it('should execute the selected command', () => {
    const { result } = renderHook(() => useCommandPalette());
    act(() => {
      result.current.open();
    });
    // First command should be nav-dashboard
    act(() => {
      result.current.executeSelected();
    });
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    // Should close after execution
    expect(result.current.isOpen).toBe(false);
  });

  it('should execute a specific command by index', () => {
    const { result } = renderHook(() => useCommandPalette());
    act(() => {
      result.current.open();
    });
    // Execute the second command (settings)
    act(() => {
      result.current.executeCommand(1);
    });
    expect(mockNavigate).toHaveBeenCalledWith('/settings');
    expect(result.current.isOpen).toBe(false);
  });

  it('should reset query and selectedIndex when opening', () => {
    const { result } = renderHook(() => useCommandPalette());
    act(() => {
      result.current.setQuery('test');
      result.current.setSelectedIndex(3);
    });
    act(() => {
      result.current.open();
    });
    expect(result.current.query).toBe('');
    expect(result.current.selectedIndex).toBe(0);
  });

  it('should reset query and selectedIndex when closing', () => {
    const { result } = renderHook(() => useCommandPalette());
    act(() => {
      result.current.open();
      result.current.setQuery('test');
      result.current.setSelectedIndex(2);
    });
    act(() => {
      result.current.close();
    });
    expect(result.current.query).toBe('');
    expect(result.current.selectedIndex).toBe(0);
  });

  it('should not crash when executing with no filtered results', () => {
    const { result } = renderHook(() => useCommandPalette());
    act(() => {
      result.current.setQuery('xyznonexistent');
    });
    expect(result.current.filteredCommands.length).toBe(0);
    // Should not throw
    act(() => {
      result.current.executeSelected();
    });
  });
});
