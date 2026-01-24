// apps/web/src/features/demo/components/DemoBottomBar.tsx
import { Button, EnvironmentBadge, Kbd, ResizablePanel, Text, VersionBadge } from '@abe-stack/ui';
import { clientConfig } from '@config';
import { KEYBOARD_SHORTCUTS } from '@demo/hooks';

import type { ReactElement } from 'react';

export interface DemoBottomBarProps {
  size: number;
  visible: boolean;
  onResize: (size: number) => void;
  totalComponents: number;
  cycleTheme: () => void;
  getThemeIcon: () => string;
  getThemeLabel: () => string;
  cycleDensity: () => void;
  getDensityLabel: () => string;
  cycleContrast: () => void;
  getContrastLabel: () => string;
}

export function DemoBottomBar({
  size,
  visible,
  onResize,
  totalComponents,
  cycleTheme,
  getThemeIcon,
  getThemeLabel,
  cycleDensity,
  getDensityLabel,
  cycleContrast,
  getContrastLabel,
}: DemoBottomBarProps): ReactElement {
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
      data-testid="demo-bottom-panel"
    >
      <div className="bar relative">
        <span className="layout-label">BottombarLayout</span>
        {/* Left: Version & Environment */}
        <div className="bar-section">
          <VersionBadge version={clientConfig.uiVersion} />
          <EnvironmentBadge environment={clientConfig.isDev ? 'development' : 'production'} />
          <Text tone="muted" className="text-xs hide-mobile">
            {totalComponents} components
          </Text>
        </div>

        {/* Center: Keyboard Shortcuts (desktop only) */}
        <div className="hide-mobile flex gap-4">
          {KEYBOARD_SHORTCUTS.map((shortcut) => (
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
            <span className="text-xs">{getDensityLabel()}</span>
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
            <span className="text-xs">{getContrastLabel()}</span>
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
            <span className="text-xs hide-mobile">{getThemeLabel()}</span>
          </Button>
        </div>
      </div>
    </ResizablePanel>
  );
}
