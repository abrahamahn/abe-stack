// apps/web/src/features/ui-library/pages/UILibraryPage.tsx
import { ResizablePanelGroup, SidePeek, useContrast, useDensity, useSidePeek } from '@abe-stack/ui';
import { AuthModal } from '@auth/components';
import { useAuth } from '@auth/hooks';
import { getAllCategories, getComponentsByCategory, getTotalComponentCount } from '@catalog/index';
import {
  UILibraryBottomBar,
  UILibraryMainLayout,
  UILibraryTopBar,
  SidePeekUILibraryContent,
} from '@ui-library/components';
import { useUILibraryKeyboard, useUILibraryPanes, useUILibraryTheme } from '@ui-library/hooks';
import { useCallback, useMemo, useState } from 'react';

import type { ComponentDemo } from '../types';
import type { AuthMode } from '@abe-stack/ui';

export const UILibraryPage = (): React.ReactElement => {
  const { cycleTheme, getThemeIcon, getThemeLabel, resolvedTheme } = useUILibraryTheme();
  const { density, cycleDensity } = useDensity('demo-density');
  const { contrastMode, cycleContrastMode } = useContrast('demo-contrast', resolvedTheme);
  const { paneConfig, togglePane, handlePaneResize, resetLayout } = useUILibraryPanes();
  const [activeCategory, setActiveCategory] = useState<string>('elements');
  const [selectedComponent, setSelectedComponent] = useState<ComponentDemo | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const authResult = useAuth();
  const user = authResult.user as { id?: string; email?: string; name?: string | null } | null;
  const { isAuthenticated, logout } = authResult;
  const { isOpen: sidePeekOpen, peekPath: _peekPath, close: closeSidePeek } = useSidePeek();

  useUILibraryKeyboard({
    togglePane,
    cycleTheme,
    clearSelection: () => {
      setSelectedComponent(null);
    },
  });

  // Memoize expensive computations
  const categories = useMemo(() => getAllCategories(), []);
  const componentsInCategory = useMemo(
    () => getComponentsByCategory(activeCategory),
    [activeCategory],
  );
  const totalComponents = useMemo(() => getTotalComponentCount(), []);

  const handleOpenAuthModal = useCallback((mode: AuthMode): void => {
    setAuthMode(mode);
    setAuthModalOpen(true);
  }, []);

  const handleTopBarResize = useCallback(
    (size: number) => {
      handlePaneResize('top', size);
    },
    [handlePaneResize],
  );

  const handleBottomBarResize = useCallback(
    (size: number) => {
      handlePaneResize('bottom', size);
    },
    [handlePaneResize],
  );

  const getDensityLabel = useCallback((): string => {
    if (density === 'compact') return 'Compact';
    if (density === 'comfortable') return 'Comfortable';
    return 'Normal';
  }, [density]);

  const getContrastLabel = useCallback((): string => {
    if (contrastMode === 'high') return 'High';
    if (contrastMode === 'normal') return 'Normal';
    return 'System';
  }, [contrastMode]);

  return (
    <>
      <div className="h-screen w-screen overflow-hidden">
        <ResizablePanelGroup direction="vertical">
          {/* Top Bar */}
          <UILibraryTopBar
            size={paneConfig.top.size}
            visible={paneConfig.top.visible}
            onResize={handleTopBarResize}
            isAuthenticated={isAuthenticated}
            user={user}
            onLogout={logout}
            onOpenAuthModal={handleOpenAuthModal}
          />

          {/* Middle + Bottom Area */}
          <ResizablePanelGroup direction="vertical" reverse className="flex-1 min-h-0">
            {/* Bottom Bar */}
            <UILibraryBottomBar
              size={paneConfig.bottom.size}
              visible={paneConfig.bottom.visible}
              onResize={handleBottomBarResize}
              totalComponents={totalComponents}
              cycleTheme={cycleTheme}
              getThemeIcon={getThemeIcon}
              getThemeLabel={getThemeLabel}
              cycleDensity={cycleDensity}
              getDensityLabel={getDensityLabel}
              cycleContrast={cycleContrastMode}
              getContrastLabel={getContrastLabel}
            />

            {/* Middle Area */}
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
      <AuthModal open={authModalOpen} onOpenChange={setAuthModalOpen} initialMode={authMode} />

      {/* Side Peek UI Library */}
      <SidePeek.Root open={sidePeekOpen} onClose={closeSidePeek} size="md">
        <SidePeek.Header>
          <SidePeek.Title>Side Peek UI Library</SidePeek.Title>
          <div className="flex gap-2">
            <SidePeek.Expand to="/side-peek-ui-library" />
            <SidePeek.Close />
          </div>
        </SidePeek.Header>
        <SidePeek.Content>
          <SidePeekUILibraryContent actionLabel="Close this panel" onAction={closeSidePeek} />
        </SidePeek.Content>
      </SidePeek.Root>
    </>
  );
};
