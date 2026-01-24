// apps/web/src/features/demo/hooks/useDemoTheme.ts
import { useThemeMode } from '@abe-stack/ui';

export type ThemeMode = 'system' | 'light' | 'dark';

interface UseDemoThemeResult {
  themeMode: ThemeMode;
  resolvedTheme: 'light' | 'dark';
  cycleTheme: () => void;
  getThemeIcon: () => string;
  getThemeLabel: () => string;
}

export function useDemoTheme(): UseDemoThemeResult {
  const { mode: themeMode, cycleMode, resolvedTheme } = useThemeMode('demo-theme-mode');

  function getThemeIcon(): string {
    if (themeMode === 'light') return '☀️';
    if (themeMode === 'dark') return '🌙';
    return '💻';
  }

  function getThemeLabel(): string {
    if (themeMode === 'light') return 'Light';
    if (themeMode === 'dark') return 'Dark';
    return 'System';
  }

  return {
    themeMode,
    resolvedTheme,
    cycleTheme: cycleMode,
    getThemeIcon,
    getThemeLabel,
  };
}
