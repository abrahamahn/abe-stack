// src/apps/web/src/app/layouts/AppLayout.tsx
import { Outlet, ResizablePanelGroup, useContrast, useDensity, useSidePeek } from '@abe-stack/ui';
import { AuthModal, NewDeviceBanner, useAuth } from '@auth';
import { useUILibraryPanes, useUILibraryTheme } from '@ui-library';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { AppBottomLayout } from './AppBottomLayout';
import { AppLayoutContext } from './AppLayoutContext';
import { AppLeftMenu } from './AppLeftMenu';
import { AppMainLayout } from './AppMainLayout';
import { AppRightInfo } from './AppRightInfo';
import { AppSidePeekLayout } from './AppSidePeekLayout';
import { AppTopLayout } from './AppTopLayout';

import type { AuthMode } from '@abe-stack/ui';
import type { ReactElement, ReactNode } from 'react';

export interface AppLayoutProps {
  children?: ReactNode;
  leftSidebar?: ReactNode;
  rightSidebar?: ReactNode;
}

export const AppLayout = ({
  children,
  leftSidebar,
  rightSidebar,
}: AppLayoutProps): ReactElement => {
  const [rightSidebarOverride, setRightSidebarOverride] = useState<ReactNode | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const { user, isAuthenticated, isLoading: isAuthLoading, logout } = useAuth();
  const { isOpen: sidePeekOpen, close: closeSidePeek } = useSidePeek();

  const { cycleTheme, getThemeIcon, getThemeLabel, resolvedTheme } =
    useUILibraryTheme('app-theme-mode');
  const { density, cycleDensity } = useDensity('app-density');
  const { contrastMode, cycleContrastMode } = useContrast('app-contrast', resolvedTheme);
  const { paneConfig, togglePane, handlePaneResize, resetLayout } =
    useUILibraryPanes('app-pane-config');

  const handleOpenAuthModal = useCallback((mode: AuthMode): void => {
    setAuthMode(mode);
    setAuthModalOpen(true);
  }, []);

  const onTopResize = useCallback(
    (size: number): void => {
      handlePaneResize('top', size);
    },
    [handlePaneResize],
  );

  const onBottomResize = useCallback(
    (size: number): void => {
      handlePaneResize('bottom', size);
    },
    [handlePaneResize],
  );

  const getDensityLabel = useCallback((): string => {
    if (density === 'compact') return 'Compact';
    if (density === 'comfortable') return 'Comfortable';
    return 'Normal';
  }, [density]);

  const setRightSidebar = useCallback((content: ReactNode | null): void => {
    setRightSidebarOverride(content);
  }, []);

  const layoutContextValue = useMemo(() => ({ setRightSidebar }), [setRightSidebar]);

  const getContrastLabel = useCallback((): string => {
    if (contrastMode === 'high') return 'High';
    if (contrastMode === 'normal') return 'Normal';
    return 'System';
  }, [contrastMode]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        event.target instanceof HTMLSelectElement ||
        (event.target instanceof HTMLElement && event.target.isContentEditable)
      ) {
        return;
      }

      switch (event.key.toUpperCase()) {
        case 'T':
          event.preventDefault();
          cycleTheme();
          break;
        case 'D':
          event.preventDefault();
          cycleDensity();
          break;
        case 'C':
          event.preventDefault();
          cycleContrastMode();
          break;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return (): void => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [cycleTheme, cycleDensity, cycleContrastMode]);

  return (
    <>
      <div className="h-screen w-screen overflow-hidden">
        <ResizablePanelGroup direction="vertical">
          <AppTopLayout
            size={paneConfig.top.size}
            visible={paneConfig.top.visible}
            onResize={onTopResize}
            isAuthLoading={isAuthLoading}
            isAuthenticated={isAuthenticated}
            user={user}
            onLogout={logout}
            onOpenAuthModal={handleOpenAuthModal}
          />

          <NewDeviceBanner />

          <ResizablePanelGroup direction="vertical" reverse className="flex-1 min-h-0">
            <AppBottomLayout
              size={paneConfig.bottom.size}
              visible={paneConfig.bottom.visible}
              onResize={onBottomResize}
              cycleTheme={cycleTheme}
              getThemeIcon={getThemeIcon}
              getThemeLabel={getThemeLabel}
              cycleDensity={cycleDensity}
              getDensityLabel={getDensityLabel}
              cycleContrast={cycleContrastMode}
              getContrastLabel={getContrastLabel}
            />

            <AppLayoutContext.Provider value={layoutContextValue}>
              <AppMainLayout
                paneConfig={paneConfig}
                togglePane={togglePane}
                handlePaneResize={handlePaneResize}
                resetLayout={resetLayout}
                leftSidebar={leftSidebar ?? <AppLeftMenu />}
                rightSidebar={rightSidebarOverride ?? rightSidebar ?? <AppRightInfo />}
              >
                {children ?? <Outlet />}
              </AppMainLayout>
            </AppLayoutContext.Provider>
          </ResizablePanelGroup>
        </ResizablePanelGroup>
      </div>
      <AuthModal open={authModalOpen} onOpenChange={setAuthModalOpen} initialMode={authMode} />
      <AppSidePeekLayout open={sidePeekOpen} onClose={closeSidePeek} />
    </>
  );
};
