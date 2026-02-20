// main/apps/web/src/features/settings/components/LanguageSelector.tsx
/**
 * Language Selector
 *
 * Locale picker that integrates with the i18n system.
 * Shows supported locales with their native display names, uses the
 * `useTranslation()` hook to read/set the active locale, and persists
 * the preference to localStorage.
 */

import { Select, Text } from '@bslt/ui';
import { useCallback, type ReactElement } from 'react';

import { LOCALE_METADATA, SUPPORTED_LOCALES, useTranslation } from '../../../i18n';

import type { Locale } from '../../../i18n';

// ============================================================================
// Constants
// ============================================================================

const LOCALE_STORAGE_KEY = 'abe-locale-preference';

// ============================================================================
// Types
// ============================================================================

export interface LanguageSelectorProps {
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

/**
 * LanguageSelector renders a dropdown of supported locales and syncs
 * the selection with the I18nProvider via `useTranslation()`.
 *
 * Behaviour:
 * - Reads the current locale from context
 * - On change, calls `setLocale()` to update the provider
 * - Persists the chosen locale to `localStorage` under `abe-locale-preference`
 * - Sets the `lang` attribute on `<html>` for downstream Intl/accessibility use
 *
 * @param props - Component props
 * @returns A locale <select> element with confirmation text
 */
export const LanguageSelector = ({ className }: LanguageSelectorProps): ReactElement => {
  const { locale, setLocale, t } = useTranslation();

  const handleLocaleChange = useCallback(
    (value: string): void => {
      // Validate that the value is a supported locale
      const isSupported = SUPPORTED_LOCALES.includes(value as Locale);
      if (!isSupported) {
        return;
      }

      const newLocale = value as Locale;
      setLocale(newLocale);
      localStorage.setItem(LOCALE_STORAGE_KEY, newLocale);
      document.documentElement.setAttribute('lang', newLocale);
    },
    [setLocale],
  );

  return (
    <div className={className} data-testid="language-selector">
      <Select
        value={locale}
        onChange={(value: string) => {
          handleLocaleChange(value);
        }}
        data-testid="language-select"
        className="max-w-md"
        aria-label={t('settings.preferences.language.title')}
      >
        {SUPPORTED_LOCALES.map((code) => {
          const meta = LOCALE_METADATA[code];
          return (
            <option key={code} value={code}>
              {meta.nativeName} ({meta.name})
            </option>
          );
        })}
      </Select>

      <Text size="sm" tone="muted" className="mt-2" data-testid="language-current">
        {t('settings.preferences.language.saved')}
      </Text>
    </div>
  );
};
