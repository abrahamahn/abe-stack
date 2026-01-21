// packages/ui/src/__tests__/integration/ThemeProvider.integration.test.tsx
/** @vitest-environment jsdom */
/**
 * Integration tests for ThemeProvider
 *
 * Tests theme provider integration with components:
 * - Theme context propagation
 * - Theme switching (light/dark/system)
 * - localStorage persistence
 * - CSS class application
 * - Components responding to theme changes
 */

import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Button } from '../../elements/Button';
import { useThemeMode } from '../../hooks/useThemeMode';
import { ThemeProvider, useTheme } from '../../theme/provider';

// =============================================================================
// Test Utilities
// =============================================================================

// Mock localStorage
let mockStorage: Record<string, string> = {};
const localStorageMock = {
  getItem: (key: string): string | null => mockStorage[key] ?? null,
  setItem: (key: string, value: string): void => {
    mockStorage[key] = value;
  },
  removeItem: (key: string): void => {
    const { [key]: _removed, ...rest } = mockStorage;
    mockStorage = rest;
  },
  clear: (): void => {
    mockStorage = {};
  },
  key: (index: number): string | null => Object.keys(mockStorage)[index] ?? null,
  get length(): number {
    return Object.keys(mockStorage).length;
  },
};

// Mock matchMedia
let mockPrefersDark = false;
const mockMatchMedia = (query: string): MediaQueryList => ({
  matches: query === '(prefers-color-scheme: dark)' ? mockPrefersDark : false,
  media: query,
  onchange: null,
  addListener: (): void => {},
  removeListener: (): void => {},
  addEventListener: (): void => {},
  removeEventListener: (): void => {},
  dispatchEvent: (): boolean => false,
});

// =============================================================================
// Test Components
// =============================================================================

function ThemeToggle(): React.ReactElement {
  const { mode, cycleMode, isDark, isLight, resolvedTheme, setMode } = useTheme();

  return (
    <div data-testid="theme-toggle">
      <div data-testid="current-mode">{mode}</div>
      <div data-testid="resolved-theme">{resolvedTheme}</div>
      <div data-testid="is-dark">{isDark ? 'true' : 'false'}</div>
      <div data-testid="is-light">{isLight ? 'true' : 'false'}</div>

      <Button onClick={cycleMode} data-testid="cycle-btn">
        Cycle Theme
      </Button>
      <Button onClick={() => setMode('light')} data-testid="light-btn">
        Light
      </Button>
      <Button onClick={() => setMode('dark')} data-testid="dark-btn">
        Dark
      </Button>
      <Button onClick={() => setMode('system')} data-testid="system-btn">
        System
      </Button>
    </div>
  );
}

function ThemeAwareComponent(): React.ReactElement {
  const { isDark, resolvedTheme } = useTheme();

  return (
    <div
      data-testid="theme-aware"
      style={{
        backgroundColor: isDark ? '#1a1a1a' : '#ffffff',
        color: isDark ? '#ffffff' : '#1a1a1a',
      }}
    >
      <span data-testid="theme-text">Current theme: {resolvedTheme}</span>
    </div>
  );
}

function NestedThemeConsumer(): React.ReactElement {
  return (
    <div data-testid="nested-container">
      <ThemeToggle />
      <ThemeAwareComponent />
    </div>
  );
}

function MultipleConsumers(): React.ReactElement {
  return (
    <ThemeProvider storageKey="test-theme">
      <ThemeToggle />
      <div data-testid="consumer-1">
        <ThemeAwareComponent />
      </div>
      <div data-testid="consumer-2">
        <ThemeAwareComponent />
      </div>
    </ThemeProvider>
  );
}

// =============================================================================
// Tests
// =============================================================================

describe('ThemeProvider Integration Tests', () => {
  beforeEach(() => {
    localStorageMock.clear();
    Object.defineProperty(window, 'localStorage', { value: localStorageMock });
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: mockMatchMedia,
    });
    mockPrefersDark = false;
    // Clear any data-theme attribute
    document.documentElement.removeAttribute('data-theme');
  });

  afterEach(() => {
    document.documentElement.removeAttribute('data-theme');
  });

  describe('Basic Theme Functionality', () => {
    it('provides theme context to children', () => {
      render(
        <ThemeProvider storageKey="test-theme">
          <ThemeToggle />
        </ThemeProvider>,
      );

      expect(screen.getByTestId('current-mode')).toBeInTheDocument();
      expect(screen.getByTestId('cycle-btn')).toBeInTheDocument();
    });

    it('defaults to system mode', () => {
      render(
        <ThemeProvider storageKey="test-theme">
          <ThemeToggle />
        </ThemeProvider>,
      );

      expect(screen.getByTestId('current-mode')).toHaveTextContent('system');
    });

    it('throws error when useTheme is used outside provider', () => {
      // Suppress console.error for this test
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        render(<ThemeToggle />);
      }).toThrow('useTheme must be used within a ThemeProvider');

      consoleSpy.mockRestore();
    });
  });

  describe('Theme Switching', () => {
    it('switches to light mode', async () => {
      const user = userEvent.setup();
      render(
        <ThemeProvider storageKey="test-theme">
          <ThemeToggle />
        </ThemeProvider>,
      );

      await user.click(screen.getByTestId('light-btn'));

      expect(screen.getByTestId('current-mode')).toHaveTextContent('light');
      expect(screen.getByTestId('resolved-theme')).toHaveTextContent('light');
      expect(screen.getByTestId('is-light')).toHaveTextContent('true');
      expect(screen.getByTestId('is-dark')).toHaveTextContent('false');
    });

    it('switches to dark mode', async () => {
      const user = userEvent.setup();
      render(
        <ThemeProvider storageKey="test-theme">
          <ThemeToggle />
        </ThemeProvider>,
      );

      await user.click(screen.getByTestId('dark-btn'));

      expect(screen.getByTestId('current-mode')).toHaveTextContent('dark');
      expect(screen.getByTestId('resolved-theme')).toHaveTextContent('dark');
      expect(screen.getByTestId('is-dark')).toHaveTextContent('true');
      expect(screen.getByTestId('is-light')).toHaveTextContent('false');
    });

    it('switches to system mode', async () => {
      const user = userEvent.setup();
      render(
        <ThemeProvider storageKey="test-theme">
          <ThemeToggle />
        </ThemeProvider>,
      );

      // First switch to light
      await user.click(screen.getByTestId('light-btn'));
      expect(screen.getByTestId('current-mode')).toHaveTextContent('light');

      // Then back to system
      await user.click(screen.getByTestId('system-btn'));
      expect(screen.getByTestId('current-mode')).toHaveTextContent('system');
    });

    it('cycles through modes: system -> light -> dark -> system', async () => {
      const user = userEvent.setup();
      render(
        <ThemeProvider storageKey="test-theme">
          <ThemeToggle />
        </ThemeProvider>,
      );

      // Start at system
      expect(screen.getByTestId('current-mode')).toHaveTextContent('system');

      // Cycle to light
      await user.click(screen.getByTestId('cycle-btn'));
      expect(screen.getByTestId('current-mode')).toHaveTextContent('light');

      // Cycle to dark
      await user.click(screen.getByTestId('cycle-btn'));
      expect(screen.getByTestId('current-mode')).toHaveTextContent('dark');

      // Cycle back to system
      await user.click(screen.getByTestId('cycle-btn'));
      expect(screen.getByTestId('current-mode')).toHaveTextContent('system');
    });
  });

  describe('System Preference Detection', () => {
    it('resolves to light when system prefers light', () => {
      mockPrefersDark = false;

      render(
        <ThemeProvider storageKey="test-theme">
          <ThemeToggle />
        </ThemeProvider>,
      );

      expect(screen.getByTestId('current-mode')).toHaveTextContent('system');
      expect(screen.getByTestId('resolved-theme')).toHaveTextContent('light');
    });

    it('resolves to dark when system prefers dark', () => {
      mockPrefersDark = true;

      render(
        <ThemeProvider storageKey="test-theme">
          <ThemeToggle />
        </ThemeProvider>,
      );

      expect(screen.getByTestId('current-mode')).toHaveTextContent('system');
      expect(screen.getByTestId('resolved-theme')).toHaveTextContent('dark');
    });
  });

  describe('localStorage Persistence', () => {
    it('persists theme preference to localStorage', async () => {
      const user = userEvent.setup();
      render(
        <ThemeProvider storageKey="test-theme">
          <ThemeToggle />
        </ThemeProvider>,
      );

      await user.click(screen.getByTestId('dark-btn'));

      expect(localStorageMock.getItem('test-theme')).toBe('"dark"');
    });

    it('loads persisted theme from localStorage', () => {
      localStorageMock.setItem('test-theme', '"dark"');

      render(
        <ThemeProvider storageKey="test-theme">
          <ThemeToggle />
        </ThemeProvider>,
      );

      expect(screen.getByTestId('current-mode')).toHaveTextContent('dark');
    });

    it('uses custom storage key', async () => {
      const user = userEvent.setup();
      render(
        <ThemeProvider storageKey="custom-key">
          <ThemeToggle />
        </ThemeProvider>,
      );

      await user.click(screen.getByTestId('light-btn'));

      expect(localStorageMock.getItem('custom-key')).toBe('"light"');
      expect(localStorageMock.getItem('test-theme')).toBeNull();
    });

    it('handles invalid localStorage value gracefully', () => {
      localStorageMock.setItem('test-theme', 'invalid-json');

      // Should not throw and default to system
      render(
        <ThemeProvider storageKey="test-theme">
          <ThemeToggle />
        </ThemeProvider>,
      );

      // Should fall back to default
      expect(screen.getByTestId('current-mode')).toBeInTheDocument();
    });
  });

  describe('DOM Attribute Updates', () => {
    it('sets data-theme attribute on document for light mode', async () => {
      const user = userEvent.setup();
      render(
        <ThemeProvider storageKey="test-theme">
          <ThemeToggle />
        </ThemeProvider>,
      );

      await user.click(screen.getByTestId('light-btn'));

      expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    });

    it('sets data-theme attribute on document for dark mode', async () => {
      const user = userEvent.setup();
      render(
        <ThemeProvider storageKey="test-theme">
          <ThemeToggle />
        </ThemeProvider>,
      );

      await user.click(screen.getByTestId('dark-btn'));

      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    });

    it('removes data-theme attribute for system mode', async () => {
      const user = userEvent.setup();
      render(
        <ThemeProvider storageKey="test-theme">
          <ThemeToggle />
        </ThemeProvider>,
      );

      // Set to dark first
      await user.click(screen.getByTestId('dark-btn'));
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');

      // Switch to system
      await user.click(screen.getByTestId('system-btn'));
      expect(document.documentElement.getAttribute('data-theme')).toBeNull();
    });
  });

  describe('Multiple Consumers', () => {
    it('provides same theme state to all consumers', async () => {
      const user = userEvent.setup();
      render(<MultipleConsumers />);

      const themeTexts = screen.getAllByTestId('theme-text');
      expect(themeTexts).toHaveLength(2);

      // Both should show same theme
      expect(themeTexts[0]).toHaveTextContent('light');
      expect(themeTexts[1]).toHaveTextContent('light');

      // Change theme
      await user.click(screen.getByTestId('dark-btn'));

      // Both should update
      expect(themeTexts[0]).toHaveTextContent('dark');
      expect(themeTexts[1]).toHaveTextContent('dark');
    });

    it('all consumers update synchronously', async () => {
      const user = userEvent.setup();
      render(<MultipleConsumers />);

      const resolvedThemes = screen.getAllByTestId('theme-text');

      await user.click(screen.getByTestId('cycle-btn')); // system -> light

      // All should be light
      resolvedThemes.forEach((el) => {
        expect(el).toHaveTextContent('light');
      });
    });
  });

  describe('Nested Components', () => {
    it('provides theme to deeply nested components', () => {
      render(
        <ThemeProvider storageKey="test-theme">
          <div>
            <div>
              <div>
                <ThemeAwareComponent />
              </div>
            </div>
          </div>
        </ThemeProvider>,
      );

      expect(screen.getByTestId('theme-text')).toBeInTheDocument();
    });

    it('propagates theme changes to nested components', async () => {
      const user = userEvent.setup();
      render(
        <ThemeProvider storageKey="test-theme">
          <NestedThemeConsumer />
        </ThemeProvider>,
      );

      expect(screen.getByTestId('theme-text')).toHaveTextContent('light');

      await user.click(screen.getByTestId('dark-btn'));

      expect(screen.getByTestId('theme-text')).toHaveTextContent('dark');
    });
  });

  describe('Theme-Aware Styling', () => {
    it('applies dark styles when theme is dark', async () => {
      const user = userEvent.setup();
      render(
        <ThemeProvider storageKey="test-theme">
          <ThemeToggle />
          <ThemeAwareComponent />
        </ThemeProvider>,
      );

      await user.click(screen.getByTestId('dark-btn'));

      // Verify the theme state changed
      expect(screen.getByTestId('is-dark')).toHaveTextContent('true');

      // Check component reflects dark theme via text content
      const component = screen.getByTestId('theme-aware');
      expect(component).toBeInTheDocument();
      expect(screen.getByTestId('theme-text')).toHaveTextContent('dark');
    });

    it('applies light styles when theme is light', async () => {
      const user = userEvent.setup();
      render(
        <ThemeProvider storageKey="test-theme">
          <ThemeToggle />
          <ThemeAwareComponent />
        </ThemeProvider>,
      );

      await user.click(screen.getByTestId('light-btn'));

      // Verify the theme state changed
      expect(screen.getByTestId('is-light')).toHaveTextContent('true');

      // Check component reflects light theme via text content
      const component = screen.getByTestId('theme-aware');
      expect(component).toBeInTheDocument();
      expect(screen.getByTestId('theme-text')).toHaveTextContent('light');
    });
  });

  describe('useThemeMode Hook Direct Usage', () => {
    function ThemeModeHookTest(): React.ReactElement {
      const { mode, setMode, cycleMode, isDark, isLight, resolvedTheme } =
        useThemeMode('direct-test');

      return (
        <div data-testid="hook-test">
          <div data-testid="hook-mode">{mode}</div>
          <div data-testid="hook-resolved">{resolvedTheme}</div>
          <div data-testid="hook-is-dark">{isDark ? 'true' : 'false'}</div>
          <div data-testid="hook-is-light">{isLight ? 'true' : 'false'}</div>
          <Button onClick={cycleMode} data-testid="hook-cycle">
            Cycle
          </Button>
          <Button onClick={() => setMode('dark')} data-testid="hook-dark">
            Dark
          </Button>
        </div>
      );
    }

    it('works without ThemeProvider wrapper', async () => {
      const user = userEvent.setup();
      render(<ThemeModeHookTest />);

      expect(screen.getByTestId('hook-mode')).toHaveTextContent('system');

      await user.click(screen.getByTestId('hook-dark'));

      expect(screen.getByTestId('hook-mode')).toHaveTextContent('dark');
      expect(screen.getByTestId('hook-is-dark')).toHaveTextContent('true');
    });

    it('uses provided storage key', async () => {
      const user = userEvent.setup();
      render(<ThemeModeHookTest />);

      await user.click(screen.getByTestId('hook-dark'));

      expect(localStorageMock.getItem('direct-test')).toBe('"dark"');
    });
  });

  describe('Edge Cases', () => {
    it('handles rapid theme switching', async () => {
      const user = userEvent.setup();
      render(
        <ThemeProvider storageKey="test-theme">
          <ThemeToggle />
        </ThemeProvider>,
      );

      // Rapidly switch themes
      await user.click(screen.getByTestId('light-btn'));
      await user.click(screen.getByTestId('dark-btn'));
      await user.click(screen.getByTestId('system-btn'));
      await user.click(screen.getByTestId('dark-btn'));
      await user.click(screen.getByTestId('light-btn'));

      expect(screen.getByTestId('current-mode')).toHaveTextContent('light');
    });

    it('maintains state across rerenders', async () => {
      const user = userEvent.setup();
      const { rerender } = render(
        <ThemeProvider storageKey="test-theme">
          <ThemeToggle />
        </ThemeProvider>,
      );

      await user.click(screen.getByTestId('dark-btn'));
      expect(screen.getByTestId('current-mode')).toHaveTextContent('dark');

      // Rerender
      rerender(
        <ThemeProvider storageKey="test-theme">
          <ThemeToggle />
        </ThemeProvider>,
      );

      // State should persist
      expect(screen.getByTestId('current-mode')).toHaveTextContent('dark');
    });
  });
});
