// src/apps/web/src/features/ui-library/UILibraryPage.tsx
import { AuthModal } from '@auth/components';

import { UILibraryPageShell, UILibrarySidePeek } from './components';
import { useUILibraryPageModel } from './hooks';

export const UILibraryPage = (): React.ReactElement => {
  const model = useUILibraryPageModel();

  return (
    <>
      <UILibraryPageShell
        paneConfig={model.paneConfig}
        togglePane={model.togglePane}
        handlePaneResize={model.handlePaneResize}
        resetLayout={model.resetLayout}
        categories={model.categories}
        activeCategory={model.activeCategory}
        setActiveCategory={model.setActiveCategory}
        componentsInCategory={model.componentsInCategory}
        selectedComponent={model.selectedComponent}
        setSelectedComponent={model.setSelectedComponent}
        topBarSize={model.topBarSize}
        topBarVisible={model.topBarVisible}
        onTopBarResize={model.onTopBarResize}
        bottomBarSize={model.bottomBarSize}
        bottomBarVisible={model.bottomBarVisible}
        onBottomBarResize={model.onBottomBarResize}
        totalComponents={model.totalComponents}
        cycleTheme={model.cycleTheme}
        getThemeIcon={model.getThemeIcon}
        getThemeLabel={model.getThemeLabel}
        cycleDensity={model.cycleDensity}
        getDensityLabel={model.getDensityLabel}
        cycleContrast={model.cycleContrastMode}
        getContrastLabel={model.getContrastLabel}
        isAuthenticated={model.isAuthenticated}
        user={model.user}
        onLogout={model.logout}
        onOpenAuthModal={model.onOpenAuthModal}
      />

      <AuthModal
        open={model.authModalOpen}
        onOpenChange={model.setAuthModalOpen}
        initialMode={model.authMode}
      />
      <UILibrarySidePeek open={model.sidePeekOpen} onClose={model.closeSidePeek} />
    </>
  );
};
