// src/apps/web/src/features/ui-library/hooks/useUILibraryPageModel.ts
import { useContrast, useDensity, useSidePeek } from '@abe-stack/ui';
import { useAuth } from '@auth/hooks';
import { getAllCategories, getComponentsByCategory, getTotalComponentCount } from '@catalog/index';
import { useUILibraryKeyboard, useUILibraryPanes, useUILibraryTheme } from '@ui-library/hooks';
import { useCallback, useMemo, useState } from 'react';

import type { ComponentDemo } from '../types';
import type { AuthMode } from '@abe-stack/ui';

export type UILibraryPageModel = {
  paneConfig: ReturnType<typeof useUILibraryPanes>['paneConfig'];
  togglePane: ReturnType<typeof useUILibraryPanes>['togglePane'];
  handlePaneResize: ReturnType<typeof useUILibraryPanes>['handlePaneResize'];
  resetLayout: ReturnType<typeof useUILibraryPanes>['resetLayout'];
  activeCategory: string;
  setActiveCategory: (category: string) => void;
  selectedComponent: ComponentDemo | null;
  setSelectedComponent: (component: ComponentDemo | null) => void;
  categories: string[];
  componentsInCategory: ComponentDemo[];
  totalComponents: number;
  authModalOpen: boolean;
  setAuthModalOpen: (open: boolean) => void;
  authMode: AuthMode;
  isAuthenticated: boolean;
  user: { id?: string; email?: string; name?: string | null } | null;
  logout: () => Promise<void>;
  onOpenAuthModal: (mode: AuthMode) => void;
  topBarSize: number;
  topBarVisible: boolean;
  bottomBarSize: number;
  bottomBarVisible: boolean;
  onTopBarResize: (size: number) => void;
  onBottomBarResize: (size: number) => void;
  cycleTheme: () => void;
  getThemeIcon: () => string;
  getThemeLabel: () => string;
  cycleDensity: () => void;
  getDensityLabel: () => string;
  cycleContrastMode: () => void;
  getContrastLabel: () => string;
  sidePeekOpen: boolean;
  closeSidePeek: () => void;
};

export const useUILibraryPageModel = (): UILibraryPageModel => {
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
  const { isOpen: sidePeekOpen, close: closeSidePeek } = useSidePeek();

  useUILibraryKeyboard({
    togglePane,
    cycleTheme,
    clearSelection: () => {
      setSelectedComponent(null);
    },
  });

  const categories = useMemo(() => getAllCategories(), []);
  const componentsInCategory = useMemo(
    () => getComponentsByCategory(activeCategory),
    [activeCategory],
  );
  const totalComponents = useMemo(() => getTotalComponentCount(), []);

  const onOpenAuthModal = useCallback((mode: AuthMode): void => {
    setAuthMode(mode);
    setAuthModalOpen(true);
  }, []);

  const onTopBarResize = useCallback(
    (size: number) => {
      handlePaneResize('top', size);
    },
    [handlePaneResize],
  );

  const onBottomBarResize = useCallback(
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

  return {
    paneConfig,
    togglePane,
    handlePaneResize,
    resetLayout,
    activeCategory,
    setActiveCategory,
    selectedComponent,
    setSelectedComponent,
    categories,
    componentsInCategory,
    totalComponents,
    authModalOpen,
    setAuthModalOpen,
    authMode,
    isAuthenticated,
    user,
    logout,
    onOpenAuthModal,
    topBarSize: paneConfig.top.size,
    topBarVisible: paneConfig.top.visible,
    bottomBarSize: paneConfig.bottom.size,
    bottomBarVisible: paneConfig.bottom.visible,
    onTopBarResize,
    onBottomBarResize,
    cycleTheme,
    getThemeIcon,
    getThemeLabel,
    cycleDensity,
    getDensityLabel,
    cycleContrastMode,
    getContrastLabel,
    sidePeekOpen,
    closeSidePeek,
  };
};
