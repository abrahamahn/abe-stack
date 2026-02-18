// main/apps/web/src/features/home/hooks/useHomePageModel.ts
import { useContrast, useDensity, useSidePeek } from '@bslt/react/hooks';
import { useUILibraryPanes, useUILibraryTheme } from '@ui-library/hooks';
import { useState } from 'react';

import { useDocContent } from './useDocContent';
import { useHomeKeyboard } from './useHomeKeyboard';

export type HomePageModel = {
  paneConfig: ReturnType<typeof useUILibraryPanes>['paneConfig'];
  togglePane: ReturnType<typeof useUILibraryPanes>['togglePane'];
  handlePaneResize: ReturnType<typeof useUILibraryPanes>['handlePaneResize'];
  resetLayout: ReturnType<typeof useUILibraryPanes>['resetLayout'];
  selectedDoc: string | null;
  content: string | null;
  isLoading: boolean;
  sidePeekOpen: boolean;
  closeSidePeek: () => void;
};

export const useHomePageModel = (): HomePageModel => {
  const { cycleTheme, resolvedTheme } = useUILibraryTheme('app-theme-mode');
  const { cycleDensity } = useDensity('app-density');
  const { cycleContrastMode } = useContrast('app-contrast', resolvedTheme);
  const { paneConfig, togglePane, handlePaneResize, resetLayout } =
    useUILibraryPanes('home-pane-config');
  const [selectedDoc, setSelectedDoc] = useState<string | null>('readme');
  const { isOpen: sidePeekOpen, close: closeSidePeek } = useSidePeek();

  const { content, isLoading } = useDocContent(selectedDoc ?? 'readme');

  useHomeKeyboard({
    togglePane,
    cycleTheme,
    cycleDensity,
    cycleContrast: cycleContrastMode,
    clearSelection: () => {
      setSelectedDoc(null);
    },
  });

  return {
    paneConfig,
    togglePane,
    handlePaneResize,
    resetLayout,
    selectedDoc,
    content,
    isLoading,
    sidePeekOpen,
    closeSidePeek,
  };
};
