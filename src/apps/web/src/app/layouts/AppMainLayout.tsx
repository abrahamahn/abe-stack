// src/apps/web/src/app/layouts/AppMainLayout.tsx
import { Button, ResizablePanel, ResizablePanelGroup, ScrollArea } from '@abe-stack/ui';
import { useCallback } from 'react';

import { AppLeftLayout } from './AppLeftLayout';
import { AppRightLayout } from './AppRightLayout';

import type { ReactElement, ReactNode } from 'react';

type PaneConfig = {
  size: number;
  visible: boolean;
};

type AppPaneConfig = {
  left: PaneConfig;
  right: PaneConfig;
  top: PaneConfig;
  bottom: PaneConfig;
};

type LayoutToggle = {
  key: keyof AppPaneConfig;
  label: string;
  icon: string;
};

const LAYOUT_TOGGLES: LayoutToggle[] = [
  { key: 'top', label: 'Top bar', icon: 'T' },
  { key: 'left', label: 'Left panel', icon: 'L' },
  { key: 'right', label: 'Right panel', icon: 'R' },
  { key: 'bottom', label: 'Bottom bar', icon: 'B' },
];

/** Props for the AppMainLayout component. */
export interface AppMainLayoutProps {
  /** Current pane visibility and size configuration */
  paneConfig: AppPaneConfig;
  /** Toggle visibility of a specific pane */
  togglePane: (pane: keyof AppPaneConfig) => void;
  /** Update the size of a specific pane after drag resize */
  handlePaneResize: (pane: keyof AppPaneConfig, size: number) => void;
  /** Reset all panes to default layout */
  resetLayout: () => void;
  /** Main content to render in the center panel */
  children: ReactNode;
  /** Optional left sidebar content (navigation, etc.) */
  leftSidebar?: ReactNode;
  /** Optional right sidebar content (details, etc.) */
  rightSidebar?: ReactNode;
}

/**
 * Main layout with resizable sidebars and center content area.
 * Provides fixed sidebar with toggle buttons, optional left/right panels,
 * and customizable center content.
 *
 * @param props - AppMainLayoutProps
 * @returns Horizontal resizable panel layout element
 */
export const AppMainLayout = ({
  paneConfig,
  togglePane,
  handlePaneResize,
  resetLayout,
  children,
  leftSidebar,
  rightSidebar,
}: AppMainLayoutProps): ReactElement => {
  const onLeftResize = useCallback(
    (size: number): void => {
      handlePaneResize('left', size);
    },
    [handlePaneResize],
  );

  const onRightResize = useCallback(
    (size: number): void => {
      handlePaneResize('right', size);
    },
    [handlePaneResize],
  );

  return (
    <div className="flex-1 min-h-0 flex h-full">
      <ResizablePanelGroup direction="horizontal" className="flex-1 min-w-0 h-full">
        {/* Fixed Sidebar with Toggle Buttons - Wrapped in a non-resizable Panel */}
        <div className="sidebar border-r h-full flex flex-col p-1 gap-1">
          <div className="flex-1" />
          <div className="spacer flex flex-col gap-1 mt-auto">
            {LAYOUT_TOGGLES.map((toggle) => (
              <Button
                key={toggle.key}
                variant={paneConfig[toggle.key].visible ? 'primary' : 'secondary'}
                onClick={() => {
                  togglePane(toggle.key);
                }}
                title={`Toggle ${toggle.label}`}
                aria-label={`Toggle ${toggle.label}`}
                className="sidebar-btn sidebar-btn-sm"
              >
                {toggle.icon}
              </Button>
            ))}
            <Button
              variant="secondary"
              onClick={resetLayout}
              title="Reset layout"
              aria-label="Reset layout"
              className="sidebar-btn sidebar-btn-sm"
            >
              ↺
            </Button>
          </div>
        </div>

        {/* Left Panel - Optional Navigation/Sidebar */}
        {leftSidebar !== undefined && (
          <ResizablePanel
            size={paneConfig.left.size}
            minSize={10}
            maxSize={28}
            collapsed={!paneConfig.left.visible}
            onResize={onLeftResize}
            className="bg-primary"
            data-testid="app-left-panel"
          >
            <AppLeftLayout>{leftSidebar}</AppLeftLayout>
          </ResizablePanel>
        )}

        {/* Content Group - fills remaining space with flex */}
        <div className="flex-1 min-w-0" style={{ minHeight: 0 }}>
          <ResizablePanelGroup direction="horizontal" reverse className="h-full w-full">
            {/* Right Panel - Optional Details/Sidebar */}
            {rightSidebar !== undefined && (
              <ResizablePanel
                size={paneConfig.right.size}
                minSize={5}
                maxSize={100}
                invertResize
                collapsed={!paneConfig.right.visible}
                onResize={onRightResize}
                className="bg-primary"
                data-testid="app-right-panel"
              >
                <AppRightLayout>{rightSidebar}</AppRightLayout>
              </ResizablePanel>
            )}

            {/* Center Panel - fills remaining space with flex */}
            <div className="flex-1 min-w-0" style={{ minHeight: 0 }}>
              <ScrollArea className="h-full w-full">
                <div className="app-main-content min-h-full p-4">{children}</div>
              </ScrollArea>
            </div>
          </ResizablePanelGroup>
        </div>
      </ResizablePanelGroup>
    </div>
  );
};
