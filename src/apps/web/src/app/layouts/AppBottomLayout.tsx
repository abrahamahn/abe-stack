// src/apps/web/src/app/layouts/AppBottomLayout.tsx
import { Button, EnvironmentBadge, Kbd, ResizablePanel, Text, VersionBadge } from '@abe-stack/ui';

import type { ReactElement } from 'react';

import { clientConfig } from '@/config';

// Keyboard shortcuts for the application
const APP_KEYBOARD_SHORTCUTS = [
  { key: 'T', description: 'Theme' },
  { key: 'D', description: 'Density' },
  { key: 'C', description: 'Contrast' },
];

/** Props for the AppBottomLayout component. */
export interface AppBottomLayoutProps {
  /** Current panel size percentage */
  size: number;
  /** Whether the bottom bar is visible */
  visible: boolean;
  /** Callback when panel is resized via drag */
  onResize: (size: number) => void;
  /** Cycle through theme modes */
  cycleTheme: () => void;
  /** Get emoji icon for current theme */
  getThemeIcon: () => string;
  /** Get label for current theme */
  getThemeLabel: () => string;
  /** Cycle through density modes */
  cycleDensity: () => void;
  /** Get label for current density */
  getDensityLabel: () => string;
  /** Cycle through contrast modes */
  cycleContrast: () => void;
  /** Get label for current contrast */
  getContrastLabel: () => string;
}

/**
 * Bottom bar panel for the application.
 * Contains version/environment badges on the left, keyboard shortcuts in center,
 * and theme/density/contrast toggles on the right.
 *
 * @param props - AppBottomLayoutProps
 * @returns Resizable bottom bar panel element
 * @complexity O(n) where n = number of keyboard shortcuts (constant ~3)
 */
export const AppBottomLayout = ({
  size,
  visible,
  onResize,
  cycleTheme,
  getThemeIcon,
  getThemeLabel,
  cycleDensity,
  getDensityLabel,
  cycleContrast,
  getContrastLabel,
}: AppBottomLayoutProps): ReactElement => {
  return (
    <ResizablePanel
      size={size}
      minSize={4}
      maxSize={20}
      direction="vertical"
      invertResize
      collapsed={!visible}
      onResize={onResize}
      className="border-t overflow-hidden"
      data-testid="app-bottom-panel"
    >
      <div className="bar relative">
        <span className="layout-label">BottombarLayout</span>
        {/* Left: Version & Environment */}
        <div className="bar-section">
          <VersionBadge version={clientConfig.uiVersion} />
          <EnvironmentBadge environment={clientConfig.isDev ? 'development' : 'production'} />
        </div>

        {/* Center: Keyboard Shortcuts (desktop only) */}
        <div className="hide-mobile flex gap-4">
          {APP_KEYBOARD_SHORTCUTS.map((shortcut) => (
            <Text key={shortcut.key} tone="muted" className="text-2xs">
              <Kbd size="sm">{shortcut.key}</Kbd> {shortcut.description}
            </Text>
          ))}
        </div>

        {/* Right: Theme Controls */}
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="small"
            onClick={cycleDensity}
            title={`Density: ${getDensityLabel()} (click to change)`}
            aria-label={`Density: ${getDensityLabel()}, click to change`}
            className="flex items-center gap-2 p-1 px-2"
          >
            <span aria-hidden>📏</span>
            <Text as="span" className="text-xs">
              {getDensityLabel()}
            </Text>
          </Button>
          <Button
            variant="secondary"
            size="small"
            onClick={cycleContrast}
            title={`Contrast: ${getContrastLabel()} (click to change)`}
            aria-label={`Contrast: ${getContrastLabel()}, click to change`}
            className="flex items-center gap-2 p-1 px-2"
          >
            <span aria-hidden>🌗</span>
            <Text as="span" className="text-xs">
              {getContrastLabel()}
            </Text>
          </Button>
          <Button
            variant="secondary"
            size="small"
            onClick={cycleTheme}
            title={`Theme: ${getThemeLabel()} (click to change)`}
            aria-label={`Theme: ${getThemeLabel()}, click to change`}
            className="flex items-center gap-2 p-1 px-2"
          >
            <span>{getThemeIcon()}</span>
            <Text as="span" className="text-xs hide-mobile">
              {getThemeLabel()}
            </Text>
          </Button>
        </div>
      </div>
    </ResizablePanel>
  );
};
