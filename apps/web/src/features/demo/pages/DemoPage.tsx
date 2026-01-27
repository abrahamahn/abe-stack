// apps/web/src/features/demo/pages/DemoPage.tsx
import { ResizablePanelGroup, SidePeek, useContrast, useDensity, useSidePeek } from '@abe-stack/ui';
import { AuthModal } from '@auth/components';
import { useAuth } from '@auth/hooks';
import { getAllCategories, getComponentsByCategory, getTotalComponentCount } from '@catalog/index';
import { DemoBottomBar, DemoMainLayout, DemoTopBar, SidePeekDemoContent } from '@demo/components';
import { useDemoKeyboard, useDemoPanes, useDemoTheme } from '@demo/hooks';
import { useCallback, useMemo, useState } from 'react';

import type { AuthMode } from '@auth/components/AuthForms';
import type { ComponentDemo } from '@demo/types';

export const DemoPage = (): React.ReactElement => {
  const { cycleTheme, getThemeIcon, getThemeLabel, resolvedTheme } = useDemoTheme();
  const { density, cycleDensity } = useDensity('demo-density');
  const { contrastMode, cycleContrastMode } = useContrast('demo-contrast', resolvedTheme);
  const { paneConfig, togglePane, handlePaneResize, resetLayout } = useDemoPanes();
  const [activeCategory, setActiveCategory] = useState<string>('elements');
  const [selectedComponent, setSelectedComponent] = useState<ComponentDemo | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const { user, isAuthenticated, logout } = useAuth();
  const { isOpen: sidePeekOpen, peekPath: _peekPath, close: closeSidePeek } = useSidePeek();

  useDemoKeyboard({
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
          <DemoTopBar
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
            <DemoBottomBar
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
            <DemoMainLayout
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

      {/* Side Peek Demo */}
      <SidePeek.Root open={sidePeekOpen} onClose={closeSidePeek} size="md">
        <SidePeek.Header>
          <SidePeek.Title>Side Peek Demo</SidePeek.Title>
          <div className="flex gap-2">
            <SidePeek.Expand to="/side-peek-demo" />
            <SidePeek.Close />
          </div>
        </SidePeek.Header>
        <SidePeek.Content>
          <SidePeekDemoContent actionLabel="Close this panel" onAction={closeSidePeek} />
        </SidePeek.Content>
      </SidePeek.Root>
    </>
  );
};
