// packages/ui/src/theme/__tests__/provider.test.tsx
/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, useTheme } from '@theme/provider';
import React from 'react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

// Helper component to access theme context
function ThemeConsumer(): React.ReactElement {
  const { mode, cycleMode, isDark, isLight, resolvedTheme, setMode } = useTheme();
  return (
    <div>
      <span data-testid="mode">{mode}</span>
      <span data-testid="resolved">{resolvedTheme}</span>
      <span data-testid="isDark">{isDark.toString()}</span>
      <span data-testid="isLight">{isLight.toString()}</span>
      <button data-testid="cycle" onClick={cycleMode}>
        Cycle
      </button>
      <button
        data-testid="set-dark"
        onClick={() => {
          setMode('dark');
        }}
      >
        Dark
      </button>
      <button
        data-testid="set-light"
        onClick={() => {
          setMode('light');
        }}
      >
        Light
      </button>
      <button
        data-testid="set-system"
        onClick={() => {
          setMode('system');
        }}
      >
        System
      </button>
    </div>
  );
}

describe('ThemeProvider', () => {
  const originalMatchMedia = window.matchMedia;

  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');

    // Mock matchMedia for prefers-color-scheme
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query === '(prefers-color-scheme: dark)',
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  describe('Basic Rendering', () => {
    it('should render children', () => {
      render(
        <ThemeProvider>
          <div data-testid="child">Content</div>
        </ThemeProvider>,
      );

      expect(screen.getByTestId('child')).toBeInTheDocument();
      expect(screen.getByText('Content')).toBeInTheDocument();
    });

    it('should apply theme class to wrapper', () => {
      const { container } = render(
        <ThemeProvider>
          <div>Content</div>
        </ThemeProvider>,
      );

      expect(container.querySelector('.theme')).toBeInTheDocument();
    });

    it('should set wrapper to full height and width', () => {
      const { container } = render(
        <ThemeProvider>
          <div>Content</div>
        </ThemeProvider>,
      );

      const wrapper = container.querySelector('.theme');
      expect(wrapper).toHaveStyle({ height: '100%', width: '100%' });
    });
  });

  describe('Theme Context', () => {
    it('should provide theme context to children', () => {
      render(
        <ThemeProvider>
          <ThemeConsumer />
        </ThemeProvider>,
      );

      expect(screen.getByTestId('mode')).toBeInTheDocument();
      expect(screen.getByTestId('resolved')).toBeInTheDocument();
    });

    it('should default to system mode', () => {
      render(
        <ThemeProvider>
          <ThemeConsumer />
        </ThemeProvider>,
      );

      expect(screen.getByTestId('mode')).toHaveTextContent('system');
    });

    it('should resolve system mode based on prefers-color-scheme', () => {
      // Mock prefers dark
      window.matchMedia = vi.fn().mockImplementation((query: string) => ({
        matches: query === '(prefers-color-scheme: dark)',
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));

      render(
        <ThemeProvider>
          <ThemeConsumer />
        </ThemeProvider>,
      );

      expect(screen.getByTestId('resolved')).toHaveTextContent('dark');
      expect(screen.getByTestId('isDark')).toHaveTextContent('true');
      expect(screen.getByTestId('isLight')).toHaveTextContent('false');
    });
  });

  describe('Theme Cycling', () => {
    it('should cycle through modes: system -> light -> dark -> system', async () => {
      const user = userEvent.setup();

      render(
        <ThemeProvider>
          <ThemeConsumer />
        </ThemeProvider>,
      );

      expect(screen.getByTestId('mode')).toHaveTextContent('system');

      await user.click(screen.getByTestId('cycle'));
      expect(screen.getByTestId('mode')).toHaveTextContent('light');

      await user.click(screen.getByTestId('cycle'));
      expect(screen.getByTestId('mode')).toHaveTextContent('dark');

      await user.click(screen.getByTestId('cycle'));
      expect(screen.getByTestId('mode')).toHaveTextContent('system');
    });
  });

  describe('setMode', () => {
    it('should set mode to dark', async () => {
      const user = userEvent.setup();

      render(
        <ThemeProvider>
          <ThemeConsumer />
        </ThemeProvider>,
      );

      await user.click(screen.getByTestId('set-dark'));
      expect(screen.getByTestId('mode')).toHaveTextContent('dark');
      expect(screen.getByTestId('resolved')).toHaveTextContent('dark');
    });

    it('should set mode to light', async () => {
      const user = userEvent.setup();

      render(
        <ThemeProvider>
          <ThemeConsumer />
        </ThemeProvider>,
      );

      await user.click(screen.getByTestId('set-light'));
      expect(screen.getByTestId('mode')).toHaveTextContent('light');
      expect(screen.getByTestId('resolved')).toHaveTextContent('light');
    });

    it('should set mode to system', async () => {
      const user = userEvent.setup();

      render(
        <ThemeProvider>
          <ThemeConsumer />
        </ThemeProvider>,
      );

      // First set to dark
      await user.click(screen.getByTestId('set-dark'));
      expect(screen.getByTestId('mode')).toHaveTextContent('dark');

      // Then set back to system
      await user.click(screen.getByTestId('set-system'));
      expect(screen.getByTestId('mode')).toHaveTextContent('system');
    });
  });

  describe('localStorage Persistence', () => {
    it('should persist mode to localStorage', async () => {
      const user = userEvent.setup();

      render(
        <ThemeProvider storageKey="test-theme">
          <ThemeConsumer />
        </ThemeProvider>,
      );

      await user.click(screen.getByTestId('set-dark'));

      const stored = localStorage.getItem('test-theme');
      expect(stored).toBe('"dark"');
    });

    it('should use custom storage key', async () => {
      const user = userEvent.setup();

      render(
        <ThemeProvider storageKey="custom-theme-key">
          <ThemeConsumer />
        </ThemeProvider>,
      );

      await user.click(screen.getByTestId('set-light'));

      expect(localStorage.getItem('custom-theme-key')).toBe('"light"');
      expect(localStorage.getItem('theme-mode')).toBeNull();
    });

    it('should restore mode from localStorage', () => {
      localStorage.setItem('theme-mode', '"dark"');

      render(
        <ThemeProvider>
          <ThemeConsumer />
        </ThemeProvider>,
      );

      expect(screen.getByTestId('mode')).toHaveTextContent('dark');
    });
  });

  describe('data-theme Attribute', () => {
    it('should set data-theme=light when mode is light', async () => {
      const user = userEvent.setup();

      render(
        <ThemeProvider>
          <ThemeConsumer />
        </ThemeProvider>,
      );

      await user.click(screen.getByTestId('set-light'));
      expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    });

    it('should set data-theme=dark when mode is dark', async () => {
      const user = userEvent.setup();

      render(
        <ThemeProvider>
          <ThemeConsumer />
        </ThemeProvider>,
      );

      await user.click(screen.getByTestId('set-dark'));
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    });

    it('should remove data-theme when mode is system', async () => {
      const user = userEvent.setup();

      render(
        <ThemeProvider>
          <ThemeConsumer />
        </ThemeProvider>,
      );

      // Set to dark first
      await user.click(screen.getByTestId('set-dark'));
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');

      // Set back to system
      await user.click(screen.getByTestId('set-system'));
      expect(document.documentElement.getAttribute('data-theme')).toBeNull();
    });
  });

  describe('useTheme Hook', () => {
    it('should throw error when used outside ThemeProvider', () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        render(<ThemeConsumer />);
      }).toThrow('useTheme must be used within a ThemeProvider');

      consoleError.mockRestore();
    });
  });

  describe('Edge Cases', () => {
    it('should handle multiple ThemeProviders (nested)', () => {
      render(
        <ThemeProvider storageKey="outer-theme">
          <div data-testid="outer">
            <ThemeProvider storageKey="inner-theme">
              <ThemeConsumer />
            </ThemeProvider>
          </div>
        </ThemeProvider>,
      );

      // Inner provider should take precedence
      expect(screen.getByTestId('mode')).toHaveTextContent('system');
    });

    it('should handle rapid mode changes', async () => {
      const user = userEvent.setup();

      render(
        <ThemeProvider>
          <ThemeConsumer />
        </ThemeProvider>,
      );

      // Rapid clicks
      await user.click(screen.getByTestId('cycle'));
      await user.click(screen.getByTestId('cycle'));
      await user.click(screen.getByTestId('cycle'));

      // Should be back to system after 3 cycles
      expect(screen.getByTestId('mode')).toHaveTextContent('system');
    });

    it('should handle null children gracefully', () => {
      expect(() => {
        render(<ThemeProvider>{null}</ThemeProvider>);
      }).not.toThrow();
    });

    it('should handle multiple children', () => {
      render(
        <ThemeProvider>
          <div data-testid="child1">First</div>
          <div data-testid="child2">Second</div>
        </ThemeProvider>,
      );

      expect(screen.getByTestId('child1')).toBeInTheDocument();
      expect(screen.getByTestId('child2')).toBeInTheDocument();
    });
  });
});
