// apps/web/src/features/ui-library/hooks/useUILibraryPanes.ts
import { useLocalStorage, useMediaQuery } from '@abe-stack/ui';
import { useCallback, useEffect, useState } from 'react';

import type { UILibraryPaneConfig } from '../types';

const DEFAULT_PANE_CONFIG: UILibraryPaneConfig = {
  top: { visible: true, size: 6 },
  left: { visible: true, size: 18 },
  right: { visible: true, size: 25 },
  bottom: { visible: true, size: 8 },
};

const MOBILE_PANE_CONFIG: UILibraryPaneConfig = {
  top: { visible: true, size: 6 },
  left: { visible: false, size: 18 },
  right: { visible: false, size: 25 },
  bottom: { visible: true, size: 8 },
};

interface UseUILibraryPanesResult {
  paneConfig: UILibraryPaneConfig;
  togglePane: (pane: keyof UILibraryPaneConfig) => void;
  handlePaneResize: (pane: keyof UILibraryPaneConfig, size: number) => void;
  resetLayout: () => void;
}

export function useUILibraryPanes(storageKey = 'demo-pane-config'): UseUILibraryPanesResult {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [paneConfig, setPaneConfig] = useLocalStorage<UILibraryPaneConfig>(
    storageKey,
    DEFAULT_PANE_CONFIG,
  );
  const [hasInitialized, setHasInitialized] = useState(false);

  // Apply mobile defaults on first load if on mobile
  useEffect(() => {
    if (!hasInitialized && isMobile) {
      setPaneConfig(MOBILE_PANE_CONFIG);
    }
    setHasInitialized(true);
  }, [isMobile, hasInitialized, setPaneConfig]);

  const togglePane = useCallback(
    (pane: keyof UILibraryPaneConfig): void => {
      setPaneConfig((prev: UILibraryPaneConfig) => ({
        ...prev,
        [pane]: { ...prev[pane], visible: !prev[pane].visible },
      }));
    },
    [setPaneConfig],
  );

  function handlePaneResize(pane: keyof UILibraryPaneConfig, size: number): void {
    setPaneConfig((prev: UILibraryPaneConfig) => ({
      ...prev,
      [pane]: { ...prev[pane], size },
    }));
  }

  function resetLayout(): void {
    setPaneConfig(isMobile ? MOBILE_PANE_CONFIG : DEFAULT_PANE_CONFIG);
  }

  return {
    paneConfig,
    togglePane,
    handlePaneResize,
    resetLayout,
  };
}
