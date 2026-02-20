// main/apps/web/src/features/settings/components/PreferencesSection.tsx
/**
 * Preferences Section
 *
 * Theme selection, timezone picker, and locale dropdown for user preferences.
 * Stores preferences in localStorage and applies them to the application.
 */

import { useMediaQuery } from '@bslt/react/hooks';
import { Button, Card, Heading, Select, Text } from '@bslt/ui';
import { useCallback, useEffect, useMemo, useState, type ReactElement } from 'react';

import { LanguageSelector } from './LanguageSelector';

// ============================================================================
// Types
// ============================================================================

type ThemeOption = 'light' | 'dark' | 'system';

export interface PreferencesSectionProps {
  className?: string;
}

// ============================================================================
// Constants
// ============================================================================

const THEME_STORAGE_KEY = 'abe-theme-preference';
const TIMEZONE_STORAGE_KEY = 'abe-timezone-preference';
const THEME_OPTIONS: { value: ThemeOption; label: string; description: string }[] = [
  { value: 'light', label: 'Light', description: 'Always use light theme' },
  { value: 'dark', label: 'Dark', description: 'Always use dark theme' },
  { value: 'system', label: 'System', description: 'Match your operating system setting' },
];

// Locale options are now provided by the LanguageSelector component
// via the i18n module (SUPPORTED_LOCALES / LOCALE_METADATA).

function getStoredTheme(): ThemeOption {
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === 'light' || stored === 'dark' || stored === 'system') {
    return stored;
  }
  return 'system';
}

function getStoredTimezone(): string {
  return localStorage.getItem(TIMEZONE_STORAGE_KEY) ?? 'auto';
}

/**
 * Get available timezone names from the browser's Intl API.
 */
function getTimezoneOptions(): { value: string; label: string }[] {
  const options: { value: string; label: string }[] = [
    { value: 'auto', label: `Auto-detect (${Intl.DateTimeFormat().resolvedOptions().timeZone})` },
  ];

  // Common timezones grouped by region
  const commonTimezones = [
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'America/Los_Angeles',
    'America/Anchorage',
    'Pacific/Honolulu',
    'America/Sao_Paulo',
    'America/Argentina/Buenos_Aires',
    'Europe/London',
    'Europe/Paris',
    'Europe/Berlin',
    'Europe/Moscow',
    'Africa/Cairo',
    'Asia/Dubai',
    'Asia/Kolkata',
    'Asia/Shanghai',
    'Asia/Tokyo',
    'Asia/Seoul',
    'Australia/Sydney',
    'Pacific/Auckland',
  ];

  for (const tz of commonTimezones) {
    try {
      // Get UTC offset for display
      const now = new Date();
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: tz,
        timeZoneName: 'shortOffset',
      });
      const parts = formatter.formatToParts(now);
      const offsetPart = parts.find((p) => p.type === 'timeZoneName');
      const offset = offsetPart?.value ?? '';
      options.push({
        value: tz,
        label: `${tz.replace(/_/g, ' ')} (${offset})`,
      });
    } catch {
      // Skip invalid timezone
    }
  }

  return options;
}

export const PreferencesSection = ({ className }: PreferencesSectionProps): ReactElement => {
  const [selectedTheme, setSelectedTheme] = useState<ThemeOption>(getStoredTheme);
  const [selectedTimezone, setSelectedTimezone] = useState<string>(getStoredTimezone);
  const prefersDark = useMediaQuery('(prefers-color-scheme: dark)');

  const timezoneOptions = useMemo(() => getTimezoneOptions(), []);

  const resolvedTheme: 'light' | 'dark' =
    selectedTheme === 'system' ? (prefersDark ? 'dark' : 'light') : selectedTheme;

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', resolvedTheme);
  }, [resolvedTheme]);

  const handleThemeChange = useCallback((theme: ThemeOption): void => {
    setSelectedTheme(theme);
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, []);

  const handleTimezoneChange = useCallback((value: string): void => {
    setSelectedTimezone(value);
    localStorage.setItem(TIMEZONE_STORAGE_KEY, value);
  }, []);

  return (
    <div className={className}>
      <div className="space-y-6">
        {/* Theme Selector */}
        <div>
          <Heading as="h4" size="sm" className="mb-2">
            Theme
          </Heading>
          <Text size="sm" tone="muted" className="mb-4">
            Choose how the application looks. Select a theme or let it follow your system settings.
          </Text>

          <div className="flex gap-3">
            {THEME_OPTIONS.map(({ value, label, description }): ReactElement => {
              const isSelected = selectedTheme === value;
              return (
                <Card
                  key={value}
                  className={`p-4 flex-1 cursor-pointer border ${
                    isSelected ? 'border-2 border-primary' : ''
                  }`}
                >
                  <Button
                    type="button"
                    variant="text"
                    className="w-full text-left"
                    onClick={() => {
                      handleThemeChange(value);
                    }}
                    aria-pressed={isSelected}
                    data-testid={`theme-option-${value}`}
                  >
                    <div>
                      <Text className={`font-medium ${isSelected ? 'text-primary' : ''}`}>
                        {label}
                      </Text>
                      <Text size="sm" tone="muted">
                        {description}
                      </Text>
                    </div>
                  </Button>
                </Card>
              );
            })}
          </div>

          <Text size="sm" tone="muted" className="mt-2">
            Current selection:{' '}
            <Text as="span" size="sm" className="font-medium" data-testid="current-theme">
              {THEME_OPTIONS.find((o) => o.value === selectedTheme)?.label ?? 'System'}
            </Text>
          </Text>
        </div>

        {/* Timezone Picker */}
        <div className="border-t pt-6">
          <Heading as="h4" size="sm" className="mb-2">
            Timezone
          </Heading>
          <Text size="sm" tone="muted" className="mb-4">
            Set your preferred timezone for displaying dates and times.
          </Text>

          <Select
            value={selectedTimezone}
            onChange={(value: string) => {
              handleTimezoneChange(value);
            }}
            data-testid="timezone-select"
            className="max-w-md"
          >
            {timezoneOptions.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>

        {/* Language Selector (i18n-aware) */}
        <div className="border-t pt-6">
          <Heading as="h4" size="sm" className="mb-2">
            Language
          </Heading>
          <Text size="sm" tone="muted" className="mb-4">
            Choose your preferred language for the application interface.
          </Text>

          <LanguageSelector />
        </div>
      </div>
    </div>
  );
};
