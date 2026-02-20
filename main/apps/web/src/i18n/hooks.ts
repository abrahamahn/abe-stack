// main/apps/web/src/i18n/hooks.ts
/**
 * React hooks for the i18n system.
 *
 * Provides convenient access to locale state and translation functions.
 * All hooks must be used within an `I18nProvider`.
 *
 * @module i18n-hooks
 */

import { useContext } from 'react';

import { I18nContext } from './provider';

import type { I18nContextValue, Locale } from './types';

// ============================================================================
// useLocale
// ============================================================================

/**
 * Returns the current active locale.
 *
 * Must be used within an `I18nProvider`.
 *
 * @returns The current locale code (e.g., 'en-US', 'es', 'fr')
 * @throws Error if used outside of I18nProvider
 *
 * @example
 * ```tsx
 * const locale = useLocale();
 * // => 'en-US'
 * ```
 */
export function useLocale(): Locale {
  const context = useContext(I18nContext);
  if (context === undefined) {
    throw new Error('useLocale must be used within an I18nProvider');
  }
  return context.locale;
}

// ============================================================================
// useTranslation
// ============================================================================

/**
 * Returns the translation function, current locale, and locale setter.
 *
 * This is the primary hook for components that need to render
 * translated text or allow locale switching.
 *
 * Must be used within an `I18nProvider`.
 *
 * @returns Object containing `t`, `locale`, and `setLocale`
 * @throws Error if used outside of I18nProvider
 *
 * @example
 * ```tsx
 * const { t, locale, setLocale } = useTranslation();
 *
 * return (
 *   <div>
 *     <h1>{t('auth.login.title')}</h1>
 *     <p>{t('greeting', { name: 'John' })}</p>
 *     <button onClick={() => setLocale('es')}>Español</button>
 *   </div>
 * );
 * ```
 */
export function useTranslation(): I18nContextValue {
  const context = useContext(I18nContext);
  if (context === undefined) {
    throw new Error('useTranslation must be used within an I18nProvider');
  }
  return context;
}
