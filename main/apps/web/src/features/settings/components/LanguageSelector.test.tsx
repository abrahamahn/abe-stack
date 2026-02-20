// main/apps/web/src/features/settings/components/LanguageSelector.test.tsx
/**
 * Language Selector Tests
 *
 * Tests for locale selection, i18n hook integration,
 * localStorage persistence, and HTML lang attribute updates.
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { LanguageSelector } from './LanguageSelector';

import type { ReactNode } from 'react';

// ============================================================================
// Mocks
// ============================================================================

const mockSetLocale = vi.fn();

vi.mock('../../../i18n', () => ({
  SUPPORTED_LOCALES: ['en-US', 'es', 'fr', 'de', 'ja', 'zh-CN'],
  LOCALE_METADATA: {
    'en-US': { code: 'en-US', name: 'English', nativeName: 'English', direction: 'ltr' },
    es: { code: 'es', name: 'Spanish', nativeName: 'Español', direction: 'ltr' },
    fr: { code: 'fr', name: 'French', nativeName: 'Français', direction: 'ltr' },
    de: { code: 'de', name: 'German', nativeName: 'Deutsch', direction: 'ltr' },
    ja: { code: 'ja', name: 'Japanese', nativeName: '日本語', direction: 'ltr' },
    'zh-CN': { code: 'zh-CN', name: 'Chinese (Simplified)', nativeName: '简体中文', direction: 'ltr' },
  },
  useTranslation: () => ({
    locale: 'en-US',
    setLocale: mockSetLocale,
    t: (key: string) => key,
  }),
}));

vi.mock('@bslt/ui', async () => {
  const actual = await vi.importActual('@bslt/ui');

  const mockSelect = ({
    children,
    value,
    onChange,
    'data-testid': testId,
    'aria-label': ariaLabel,
    className,
  }: {
    children: ReactNode;
    value?: string;
    onChange?: (value: string) => void;
    'data-testid'?: string;
    'aria-label'?: string;
    className?: string;
  }) => (
    <select
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      data-testid={testId}
      aria-label={ariaLabel}
      className={className}
    >
      {children}
    </select>
  );

  const mockText = ({
    children,
    className,
    'data-testid': testId,
  }: {
    children: ReactNode;
    className?: string;
    'data-testid'?: string;
    size?: string;
    tone?: string;
  }) => (
    <span className={className} data-testid={testId}>
      {children}
    </span>
  );

  return {
    ...actual,
    Select: mockSelect,
    Text: mockText,
  };
});

// ============================================================================
// Tests
// ============================================================================

describe('LanguageSelector', () => {
  let setItemSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    window.localStorage.clear();
    setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
    document.documentElement.removeAttribute('lang');
    mockSetLocale.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.documentElement.removeAttribute('lang');
  });

  // ============================================================================
  // Rendering
  // ============================================================================

  describe('rendering', () => {
    it('should render the language selector container', () => {
      render(<LanguageSelector />);
      expect(screen.getByTestId('language-selector')).toBeInTheDocument();
    });

    it('should render the select element', () => {
      render(<LanguageSelector />);
      expect(screen.getByTestId('language-select')).toBeInTheDocument();
    });

    it('should render all supported locale options', () => {
      render(<LanguageSelector />);
      const select = screen.getByTestId('language-select');
      const options = select.querySelectorAll('option');
      expect(options).toHaveLength(6);
    });

    it('should show native names with English names in parentheses', () => {
      render(<LanguageSelector />);
      expect(screen.getByText('English (English)')).toBeInTheDocument();
      expect(screen.getByText('Español (Spanish)')).toBeInTheDocument();
      expect(screen.getByText('Français (French)')).toBeInTheDocument();
    });

    it('should render the confirmation text', () => {
      render(<LanguageSelector />);
      expect(screen.getByTestId('language-current')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      render(<LanguageSelector className="custom-class" />);
      expect(screen.getByTestId('language-selector')).toHaveClass('custom-class');
    });
  });

  // ============================================================================
  // Locale Selection
  // ============================================================================

  describe('locale selection', () => {
    it('should have the current locale selected', () => {
      render(<LanguageSelector />);
      const select = screen.getByTestId('language-select') as HTMLSelectElement;
      expect(select.value).toBe('en-US');
    });

    it('should call setLocale when a new locale is selected', () => {
      render(<LanguageSelector />);
      const select = screen.getByTestId('language-select');
      fireEvent.change(select, { target: { value: 'es' } });
      expect(mockSetLocale).toHaveBeenCalledWith('es');
    });

    it('should not call setLocale for unsupported locale values', () => {
      render(<LanguageSelector />);
      const select = screen.getByTestId('language-select');
      fireEvent.change(select, { target: { value: 'xx-XX' } });
      expect(mockSetLocale).not.toHaveBeenCalled();
    });
  });

  // ============================================================================
  // Persistence
  // ============================================================================

  describe('persistence', () => {
    it('should save selected locale to localStorage', () => {
      render(<LanguageSelector />);
      const select = screen.getByTestId('language-select');
      fireEvent.change(select, { target: { value: 'fr' } });
      expect(setItemSpy).toHaveBeenCalledWith('abe-locale-preference', 'fr');
    });

    it('should set the lang attribute on the document element', () => {
      render(<LanguageSelector />);
      const select = screen.getByTestId('language-select');
      fireEvent.change(select, { target: { value: 'es' } });
      expect(document.documentElement.getAttribute('lang')).toBe('es');
    });
  });
});
