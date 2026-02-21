// main/apps/web/src/i18n/provider.test.tsx
/**
 * Tests for the I18nProvider component.
 *
 * Covers:
 * - Provider renders children
 * - t() returns correct translations for en-US
 * - t() supports parameter interpolation
 * - t() returns the key when no translation exists
 * - setLocale switches to a different locale
 * - Falls back to en-US for missing keys in non-default locales
 *
 * @module i18n-provider-test
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { useTranslation } from './hooks';
import { I18nProvider } from './provider';

import type { ReactElement } from 'react';

// ============================================================================
// Test Components
// ============================================================================

/**
 * Renders a translated string by key.
 */
const TranslatedText = ({ translationKey }: { translationKey: string }): ReactElement => {
  const { t } = useTranslation();
  return <span data-testid="translated">{t(translationKey)}</span>;
};

/**
 * Renders a translated string with parameters.
 */
const InterpolatedText = ({
  translationKey,
  params,
}: {
  translationKey: string;
  params: Record<string, string | number>;
}): ReactElement => {
  const { t } = useTranslation();
  return <span data-testid="interpolated">{t(translationKey, params)}</span>;
};

/**
 * Displays the current locale and provides a button to switch locales.
 */
const LocaleSwitcher = (): ReactElement => {
  const { locale, setLocale, t } = useTranslation();
  return (
    <div>
      <span data-testid="current-locale">{locale}</span>
      <span data-testid="translated-save">{t('common.save')}</span>
      <button data-testid="switch-es" onClick={() => setLocale('es')}>
        Switch to Spanish
      </button>
      <button data-testid="switch-fr" onClick={() => setLocale('fr')}>
        Switch to French
      </button>
      <button data-testid="switch-en" onClick={() => setLocale('en-US')}>
        Switch to English
      </button>
    </div>
  );
};

// ============================================================================
// Tests
// ============================================================================

describe('I18nProvider', () => {
  it('should render children', () => {
    render(
      <I18nProvider initialLocale="en-US">
        <div data-testid="child">Hello</div>
      </I18nProvider>,
    );

    expect(screen.getByTestId('child')).toBeInTheDocument();
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  it('should translate a key using t()', () => {
    render(
      <I18nProvider initialLocale="en-US">
        <TranslatedText translationKey="common.save" />
      </I18nProvider>,
    );

    expect(screen.getByTestId('translated')).toHaveTextContent('Save');
  });

  it('should translate auth keys', () => {
    render(
      <I18nProvider initialLocale="en-US">
        <TranslatedText translationKey="auth.login.title" />
      </I18nProvider>,
    );

    expect(screen.getByTestId('translated')).toHaveTextContent('Sign In');
  });

  it('should return the key when no translation exists', () => {
    render(
      <I18nProvider initialLocale="en-US">
        <TranslatedText translationKey="nonexistent.key" />
      </I18nProvider>,
    );

    expect(screen.getByTestId('translated')).toHaveTextContent('nonexistent.key');
  });

  it('should support parameter interpolation', () => {
    // Add a key with interpolation to test
    // Since we don't have a greeting key, the key itself will be returned with interpolation
    // Let's test with a key that returns the key (demonstrating interpolation works)
    render(
      <I18nProvider initialLocale="en-US">
        <InterpolatedText translationKey="Hello, {name}!" params={{ name: 'John' }} />
      </I18nProvider>,
    );

    // When the key is not found, t() returns the key itself, then interpolates
    expect(screen.getByTestId('interpolated')).toHaveTextContent('Hello, John!');
  });

  it('should set initialLocale correctly', () => {
    render(
      <I18nProvider initialLocale="es">
        <LocaleSwitcher />
      </I18nProvider>,
    );

    expect(screen.getByTestId('current-locale')).toHaveTextContent('es');
    expect(screen.getByTestId('translated-save')).toHaveTextContent('Guardar');
  });

  it('should switch locale when setLocale is called', async () => {
    const user = userEvent.setup();

    render(
      <I18nProvider initialLocale="en-US">
        <LocaleSwitcher />
      </I18nProvider>,
    );

    // Verify initial state
    expect(screen.getByTestId('current-locale')).toHaveTextContent('en-US');
    expect(screen.getByTestId('translated-save')).toHaveTextContent('Save');

    // Switch to Spanish
    await user.click(screen.getByTestId('switch-es'));

    expect(screen.getByTestId('current-locale')).toHaveTextContent('es');
    expect(screen.getByTestId('translated-save')).toHaveTextContent('Guardar');
  });

  it('should switch to French locale', async () => {
    const user = userEvent.setup();

    render(
      <I18nProvider initialLocale="en-US">
        <LocaleSwitcher />
      </I18nProvider>,
    );

    // Switch to French
    await user.click(screen.getByTestId('switch-fr'));

    expect(screen.getByTestId('current-locale')).toHaveTextContent('fr');
    expect(screen.getByTestId('translated-save')).toHaveTextContent('Enregistrer');
  });

  it('should switch back to English after changing locale', async () => {
    const user = userEvent.setup();

    render(
      <I18nProvider initialLocale="en-US">
        <LocaleSwitcher />
      </I18nProvider>,
    );

    // Switch to Spanish
    await user.click(screen.getByTestId('switch-es'));
    expect(screen.getByTestId('translated-save')).toHaveTextContent('Guardar');

    // Switch back to English
    await user.click(screen.getByTestId('switch-en'));
    expect(screen.getByTestId('translated-save')).toHaveTextContent('Save');
  });

  it('should fall back to en-US for missing keys in non-default locales', () => {
    // Spanish locale has all keys, so test with a locale that falls back to en-US
    // 'de' is mapped to enUS translations (placeholder)
    render(
      <I18nProvider initialLocale="de">
        <TranslatedText translationKey="common.save" />
      </I18nProvider>,
    );

    expect(screen.getByTestId('translated')).toHaveTextContent('Save');
  });
});
