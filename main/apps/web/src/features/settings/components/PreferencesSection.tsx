// main/apps/web/src/features/settings/components/PreferencesSection.tsx
/**
 * Preferences Section
 *
 * Theme selection for user preferences.
 * Stores theme in localStorage and applies it via data-theme attribute on document root.
 */

import { useMediaQuery } from '@bslt/react/hooks';
import { Button, Card, Heading, Text } from '@bslt/ui';
import { useCallback, useEffect, useState, type ReactElement } from 'react';

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

const THEME_OPTIONS: { value: ThemeOption; label: string; description: string }[] = [
  { value: 'light', label: 'Light', description: 'Always use light theme' },
  { value: 'dark', label: 'Dark', description: 'Always use dark theme' },
  { value: 'system', label: 'System', description: 'Match your operating system setting' },
];

function getStoredTheme(): ThemeOption {
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === 'light' || stored === 'dark' || stored === 'system') {
    return stored;
  }
  return 'system';
}

export const PreferencesSection = ({ className }: PreferencesSectionProps): ReactElement => {
  const [selectedTheme, setSelectedTheme] = useState<ThemeOption>(getStoredTheme);
  const prefersDark = useMediaQuery('(prefers-color-scheme: dark)');

  const resolvedTheme: 'light' | 'dark' =
    selectedTheme === 'system' ? (prefersDark ? 'dark' : 'light') : selectedTheme;

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', resolvedTheme);
  }, [resolvedTheme]);

  const handleThemeChange = useCallback((theme: ThemeOption): void => {
    setSelectedTheme(theme);
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, []);

  return (
    <div className={className}>
      <div className="space-y-4">
        <div>
          <Heading as="h4" size="sm" className="mb-2">
            Theme
          </Heading>
          <Text size="sm" tone="muted" className="mb-4">
            Choose how the application looks. Select a theme or let it follow your system settings.
          </Text>
        </div>

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

        <Text size="sm" tone="muted">
          Current selection:{' '}
          <Text as="span" size="sm" className="font-medium" data-testid="current-theme">
            {THEME_OPTIONS.find((o) => o.value === selectedTheme)?.label ?? 'System'}
          </Text>
        </Text>
      </div>
    </div>
  );
};
