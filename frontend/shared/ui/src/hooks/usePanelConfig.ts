// packages/ui/src/hooks/usePanelConfig.ts
import { useCallback } from 'react';

import { useLocalStorage } from './useLocalStorage';

export type PanelState = {
  visible: boolean;
  size: number;
};

export type PanelConfig<T extends string = string> = Record<T, PanelState>;

export type UsePanelConfigReturn<T extends string> = {
  /**
   * Current panel configuration
   */
  config: PanelConfig<T>;
  /**
   * Toggle panel visibility
   */
  togglePane: (pane: T) => void;
  /**
   * Update panel size
   */
  resizePane: (pane: T, size: number) => void;
  /**
   * Reset to default configuration
   */
  resetConfig: () => void;
  /**
   * Set entire configuration
   */
  setConfig: (config: PanelConfig<T>) => void;
};

/**
 * Hook for managing resizable panel configurations with localStorage persistence
 *
 * @example
 * ```tsx
 * const defaultConfig = {
 *   left: { visible: true, size: 20 },
 *   right: { visible: true, size: 25 },
 * };
 *
 * const { config, togglePane, resizePane, resetConfig } = usePanelConfig(
 *   'panel-config',
 *   defaultConfig
 * );
 *
 * <ResizablePanel
 *   size={config.left.size}
 *   collapsed={!config.left.visible}
 *   onResize={(size) => resizePane('left', size)}
 * />
 * ```
 */
export function usePanelConfig<T extends string>(
  storageKey: string,
  defaultConfig: PanelConfig<T>,
): UsePanelConfigReturn<T> {
  const [config, setConfig] = useLocalStorage<PanelConfig<T>>(storageKey, defaultConfig);

  const togglePane = useCallback(
    (pane: T): void => {
      setConfig((prev) => ({
        ...prev,
        [pane]: { ...prev[pane], visible: !prev[pane].visible },
      }));
    },
    [setConfig],
  );

  const resizePane = useCallback(
    (pane: T, size: number): void => {
      setConfig((prev) => ({
        ...prev,
        [pane]: { ...prev[pane], size },
      }));
    },
    [setConfig],
  );

  const resetConfig = useCallback((): void => {
    setConfig(defaultConfig);
  }, [defaultConfig, setConfig]);

  return {
    config,
    togglePane,
    resizePane,
    resetConfig,
    setConfig,
  };
}
