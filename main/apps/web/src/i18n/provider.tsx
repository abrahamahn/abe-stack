// main/apps/web/src/i18n/provider.tsx
/**
 * I18n React context provider.
 *
 * Provides locale state management and a `t()` translation function
 * to the component tree. Built as a lightweight custom solution
 * without external dependencies.
 *
 * Usage:
 * ```tsx
 * <I18nProvider>
 *   <App />
 * </I18nProvider>
 * ```
 *
 * @module i18n-provider
 */

import { createContext, useCallback, useMemo, useState } from 'react';

import { enUS } from './locales/en-US';
import { es } from './locales/es';
import { fr } from './locales/fr';
import { DEFAULT_LOCALE } from './types';
import { detectLocale, interpolate } from './utils';

import type { FlatTranslationMap, I18nContextValue, Locale } from './types';
import type { ReactElement, ReactNode } from 'react';

// ============================================================================
// Translation Registry
// ============================================================================

/**
 * Map of locale codes to their translation maps.
 *
 * New locales are registered here. Each locale must provide a
 * FlatTranslationMap with dot-notation keys matching en-US.
 */
const translationRegistry: Record<Locale, FlatTranslationMap> = {
  'en-US': enUS,
  es,
  fr,
  // Placeholder entries for unsupported locales — fall back to en-US at runtime
  de: enUS,
  ja: enUS,
  'zh-CN': enUS,
};

// ============================================================================
// Context
// ============================================================================

/**
 * React context for i18n values.
 *
 * Consumers should use `useTranslation()` or `useLocale()` hooks
 * rather than accessing this context directly.
 */
export const I18nContext = createContext<I18nContextValue | undefined>(undefined);

// ============================================================================
// Provider
// ============================================================================

/**
 * Props for the I18nProvider component.
 */
export interface I18nProviderProps {
  /** Child components that will have access to i18n context */
  children: ReactNode;
  /** Initial locale override (defaults to browser-detected locale) */
  initialLocale?: Locale;
}

/**
 * I18nProvider wraps the application and provides translation capabilities.
 *
 * Features:
 * - Stores current locale in React state
 * - Provides `t(key, params?)` for translating keys with optional interpolation
 * - Provides `setLocale(locale)` to switch languages at runtime
 * - Auto-detects browser locale on mount (can be overridden via props)
 * - Falls back to en-US for missing translation keys
 *
 * @param props - Provider props
 * @returns Provider element wrapping children
 *
 * @example
 * ```tsx
 * // Auto-detect locale
 * <I18nProvider>
 *   <App />
 * </I18nProvider>
 *
 * // Force specific locale
 * <I18nProvider initialLocale="es">
 *   <App />
 * </I18nProvider>
 * ```
 *
 * @complexity O(1) for t() lookups (hash map access)
 */
export const I18nProvider = ({ children, initialLocale }: I18nProviderProps): ReactElement => {
  const [locale, setLocale] = useState<Locale>(initialLocale ?? detectLocale());

  /**
   * Translate a key with optional parameter interpolation.
   *
   * Lookup order:
   * 1. Current locale's translation map
   * 2. en-US fallback
   * 3. Raw key (if no translation found)
   */
  const t = useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      const translations = translationRegistry[locale];
      const fallback = translationRegistry[DEFAULT_LOCALE];

      const template = translations[key] ?? fallback[key] ?? key;

      return interpolate(template, params);
    },
    [locale],
  );

  const value = useMemo<I18nContextValue>(() => ({ locale, setLocale, t }), [locale, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};
