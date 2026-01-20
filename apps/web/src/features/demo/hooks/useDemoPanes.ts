// apps/web/src/features/demo/hooks/useDemoPanes.ts
import { useLocalStorage, useMediaQuery } from '@abe-stack/ui';
import { useCallback, useEffect, useState } from 'react';

import type { DemoPaneConfig } from '@demo/types';

const DEFAULT_PANE_CONFIG: DemoPaneConfig = {
  top: { visible: true, size: 6 },
  left: { visible: true, size: 18 },
  right: { visible: true, size: 25 },
  bottom: { visible: true, size: 8 },
};

const MOBILE_PANE_CONFIG: DemoPaneConfig = {
  top: { visible: true, size: 6 },
  left: { visible: false, size: 18 },
  right: { visible: false, size: 25 },
  bottom: { visible: true, size: 8 },
};

interface UseDemoPanesResult {
  paneConfig: DemoPaneConfig;
  togglePane: (pane: keyof DemoPaneConfig) => void;
  handlePaneResize: (pane: keyof DemoPaneConfig, size: number) => void;
  resetLayout: () => void;
}

export function useDemoPanes(): UseDemoPanesResult {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [paneConfig, setPaneConfig] = useLocalStorage<DemoPaneConfig>(
    'demo-pane-config',
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
    (pane: keyof DemoPaneConfig): void => {
      setPaneConfig((prev: DemoPaneConfig) => ({
        ...prev,
        [pane]: { ...prev[pane], visible: !prev[pane].visible },
      }));
    },
    [setPaneConfig],
  );

  function handlePaneResize(pane: keyof DemoPaneConfig, size: number): void {
    setPaneConfig((prev: DemoPaneConfig) => ({
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
