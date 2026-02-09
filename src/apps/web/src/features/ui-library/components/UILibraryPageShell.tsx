// src/apps/web/src/features/ui-library/components/UILibraryPageShell.tsx
import { ResizablePanelGroup } from '@abe-stack/ui';
import { UILibraryBottomBar, UILibraryMainLayout, UILibraryTopBar } from '@ui-library/components';

import type { ComponentDemo, UILibraryPaneConfig } from '../types';
import type { AuthMode } from '@abe-stack/ui';
import type { ReactElement } from 'react';

export interface UILibraryPageShellProps {
  paneConfig: UILibraryPaneConfig;
  togglePane: (pane: keyof UILibraryPaneConfig) => void;
  handlePaneResize: (pane: keyof UILibraryPaneConfig, size: number) => void;
  resetLayout: () => void;
  categories: string[];
  activeCategory: string;
  setActiveCategory: (category: string) => void;
  componentsInCategory: ComponentDemo[];
  selectedComponent: ComponentDemo | null;
  setSelectedComponent: (component: ComponentDemo | null) => void;
  topBarSize: number;
  topBarVisible: boolean;
  onTopBarResize: (size: number) => void;
  bottomBarSize: number;
  bottomBarVisible: boolean;
  onBottomBarResize: (size: number) => void;
  totalComponents: number;
  cycleTheme: () => void;
  getThemeIcon: () => string;
  getThemeLabel: () => string;
  cycleDensity: () => void;
  getDensityLabel: () => string;
  cycleContrast: () => void;
  getContrastLabel: () => string;
  isAuthenticated: boolean;
  user: { email?: string } | null;
  onLogout: () => Promise<void>;
  onOpenAuthModal: (mode: AuthMode) => void;
}

export const UILibraryPageShell = ({
  paneConfig,
  togglePane,
  handlePaneResize,
  resetLayout,
  categories,
  activeCategory,
  setActiveCategory,
  componentsInCategory,
  selectedComponent,
  setSelectedComponent,
  topBarSize,
  topBarVisible,
  onTopBarResize,
  bottomBarSize,
  bottomBarVisible,
  onBottomBarResize,
  totalComponents,
  cycleTheme,
  getThemeIcon,
  getThemeLabel,
  cycleDensity,
  getDensityLabel,
  cycleContrast,
  getContrastLabel,
  isAuthenticated,
  user,
  onLogout,
  onOpenAuthModal,
}: UILibraryPageShellProps): ReactElement => {
  return (
    <div className="h-screen w-screen overflow-hidden">
      <ResizablePanelGroup direction="vertical">
        <UILibraryTopBar
          size={topBarSize}
          visible={topBarVisible}
          onResize={onTopBarResize}
          isAuthenticated={isAuthenticated}
          user={user}
          onLogout={onLogout}
          onOpenAuthModal={onOpenAuthModal}
        />

        <ResizablePanelGroup direction="vertical" reverse className="flex-1 min-h-0">
          <UILibraryBottomBar
            size={bottomBarSize}
            visible={bottomBarVisible}
            onResize={onBottomBarResize}
            totalComponents={totalComponents}
            cycleTheme={cycleTheme}
            getThemeIcon={getThemeIcon}
            getThemeLabel={getThemeLabel}
            cycleDensity={cycleDensity}
            getDensityLabel={getDensityLabel}
            cycleContrast={cycleContrast}
            getContrastLabel={getContrastLabel}
          />

          <UILibraryMainLayout
            paneConfig={paneConfig}
            togglePane={togglePane}
            handlePaneResize={handlePaneResize}
            resetLayout={resetLayout}
            categories={categories}
            activeCategory={activeCategory}
            setActiveCategory={setActiveCategory}
            componentsInCategory={componentsInCategory}
            selectedComponent={selectedComponent}
            setSelectedComponent={setSelectedComponent}
          />
        </ResizablePanelGroup>
      </ResizablePanelGroup>
    </div>
  );
};
