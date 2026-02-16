// main/apps/web/src/features/settings/components/PreferencesSection.test.tsx
/**
 * Preferences Section Tests
 *
 * Tests for theme selection, localStorage persistence,
 * and data-theme attribute application.
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import { PreferencesSection } from './PreferencesSection';

import type { ReactNode } from 'react';

// Mock UI components
vi.mock('@abe-stack/ui', async () => {
  const actual = await vi.importActual('@abe-stack/ui');

  const mockButton = ({
    children,
    onClick,
    'aria-pressed': ariaPressed,
    'data-testid': testId,
    className,
  }: {
    children: ReactNode;
    onClick?: () => void;
    'aria-pressed'?: boolean;
    'data-testid'?: string;
    className?: string;
  }) => (
    <button onClick={onClick} aria-pressed={ariaPressed} data-testid={testId} className={className}>
      {children}
    </button>
  );

  const mockCard = ({ children, className }: { children: ReactNode; className?: string }) => (
    <div data-testid="card" className={className}>
      {children}
    </div>
  );

  const mockHeading = ({ children }: { children: ReactNode }) => <h4>{children}</h4>;

  const mockText = ({
    children,
    className,
    'data-testid': testId,
    as: Tag = 'span',
  }: {
    children: ReactNode;
    className?: string;
    'data-testid'?: string;
    as?: string;
    size?: string;
    tone?: string;
  }) => {
    const Component = Tag as keyof HTMLElementTagNameMap;
    return (
      <Component className={className} data-testid={testId}>
        {children}
      </Component>
    );
  };

  return {
    ...actual,
    Button: mockButton,
    Card: mockCard,
    Heading: mockHeading,
    Text: mockText,
  };
});

describe('PreferencesSection', () => {
  const THEME_STORAGE_KEY = 'abe-theme-preference';
  let getItemSpy: ReturnType<typeof vi.spyOn>;
  let setItemSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    window.localStorage.clear();
    getItemSpy = vi.spyOn(Storage.prototype, 'getItem');
    setItemSpy = vi.spyOn(Storage.prototype, 'setItem');

    // Reset data-theme attribute
    document.documentElement.removeAttribute('data-theme');
  });

  afterEach(() => {
    vi.restoreAllMocks();
    window.localStorage.removeItem(THEME_STORAGE_KEY);
    document.documentElement.removeAttribute('data-theme');
  });

  // ============================================================================
  // Rendering
  // ============================================================================

  describe('rendering', () => {
    it('should render theme heading', () => {
      render(<PreferencesSection />);
      expect(screen.getByText('Theme')).toBeInTheDocument();
    });

    it('should render all three theme options', () => {
      render(<PreferencesSection />);
      expect(screen.getByTestId('theme-option-light')).toBeInTheDocument();
      expect(screen.getByTestId('theme-option-dark')).toBeInTheDocument();
      expect(screen.getByTestId('theme-option-system')).toBeInTheDocument();
    });

    it('should render theme option labels', () => {
      render(<PreferencesSection />);
      expect(screen.getByText('Light')).toBeInTheDocument();
      expect(screen.getByText('Dark')).toBeInTheDocument();
      // "System" appears in both the option label and current selection display,
      // so we verify via the button test ID instead
      expect(screen.getByTestId('theme-option-system')).toBeInTheDocument();
    });

    it('should render theme descriptions', () => {
      render(<PreferencesSection />);
      expect(screen.getByText('Always use light theme')).toBeInTheDocument();
      expect(screen.getByText('Always use dark theme')).toBeInTheDocument();
      expect(screen.getByText('Match your operating system setting')).toBeInTheDocument();
    });

    it('should render current selection text', () => {
      render(<PreferencesSection />);
      expect(screen.getByText(/Current selection:/)).toBeInTheDocument();
    });
  });

  // ============================================================================
  // Default Theme
  // ============================================================================

  describe('default theme', () => {
    it('should default to system when no stored preference', () => {
      getItemSpy.mockReturnValue(null);
      render(<PreferencesSection />);

      const systemButton = screen.getByTestId('theme-option-system');
      expect(systemButton).toHaveAttribute('aria-pressed', 'true');
    });

    it('should load stored theme from localStorage', () => {
      getItemSpy.mockReturnValue('dark');
      render(<PreferencesSection />);

      const darkButton = screen.getByTestId('theme-option-dark');
      expect(darkButton).toHaveAttribute('aria-pressed', 'true');
    });

    it('should fall back to system for invalid stored value', () => {
      getItemSpy.mockReturnValue('invalid');
      render(<PreferencesSection />);

      const systemButton = screen.getByTestId('theme-option-system');
      expect(systemButton).toHaveAttribute('aria-pressed', 'true');
    });
  });

  // ============================================================================
  // Theme Selection
  // ============================================================================

  describe('theme selection', () => {
    it('should update selection when clicking light theme', () => {
      render(<PreferencesSection />);

      const lightButton = screen.getByTestId('theme-option-light');
      fireEvent.click(lightButton);

      expect(lightButton).toHaveAttribute('aria-pressed', 'true');
    });

    it('should update selection when clicking dark theme', () => {
      render(<PreferencesSection />);

      const darkButton = screen.getByTestId('theme-option-dark');
      fireEvent.click(darkButton);

      expect(darkButton).toHaveAttribute('aria-pressed', 'true');
    });

    it('should save theme to localStorage on selection', () => {
      render(<PreferencesSection />);

      fireEvent.click(screen.getByTestId('theme-option-dark'));
      expect(setItemSpy).toHaveBeenCalledWith('abe-theme-preference', 'dark');
    });

    it('should deselect previous theme when new one is selected', () => {
      getItemSpy.mockReturnValue('light');
      render(<PreferencesSection />);

      const darkButton = screen.getByTestId('theme-option-dark');
      fireEvent.click(darkButton);

      const lightButton = screen.getByTestId('theme-option-light');
      expect(lightButton).toHaveAttribute('aria-pressed', 'false');
      expect(darkButton).toHaveAttribute('aria-pressed', 'true');
    });
  });

  // ============================================================================
  // Theme Application
  // ============================================================================

  describe('theme application', () => {
    it('should set data-theme attribute on document root for light', () => {
      render(<PreferencesSection />);

      fireEvent.click(screen.getByTestId('theme-option-light'));
      expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    });

    it('should set data-theme attribute on document root for dark', () => {
      render(<PreferencesSection />);

      fireEvent.click(screen.getByTestId('theme-option-dark'));
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    });

    it('should apply system theme on mount when system is selected', () => {
      getItemSpy.mockReturnValue('system');
      render(<PreferencesSection />);

      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      expect(document.documentElement.getAttribute('data-theme')).toBe(
        prefersDark ? 'dark' : 'light',
      );
    });
  });

  // ============================================================================
  // Current Selection Display
  // ============================================================================

  describe('current selection display', () => {
    it('should show System as current selection by default', () => {
      getItemSpy.mockReturnValue(null);
      render(<PreferencesSection />);
      expect(screen.getByTestId('current-theme')).toHaveTextContent('System');
    });

    it('should update current selection display when theme changes', () => {
      render(<PreferencesSection />);

      fireEvent.click(screen.getByTestId('theme-option-dark'));
      expect(screen.getByTestId('current-theme')).toHaveTextContent('Dark');
    });
  });
});
