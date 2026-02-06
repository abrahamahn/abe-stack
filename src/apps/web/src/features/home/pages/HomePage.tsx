// apps/web/src/features/home/pages/HomePage.tsx
import {
  ResizablePanelGroup,
  SidePeek,
  Text,
  useContrast,
  useDensity,
  useSidePeek,
} from '@abe-stack/ui';
import { AuthModal } from '@auth/components';
import { useAuth } from '@auth/hooks';
import { useUILibraryPanes, useUILibraryTheme } from '@ui-library/hooks';
import { useCallback, useState } from 'react';

import { HomeBottomBar, HomeMainLayout, HomeTopBar } from '../components';
import { useDocContent, useHomeKeyboard } from '../hooks';

import type { DocKey } from '../types';
import type { AuthMode } from '@abe-stack/ui';

/**
 * Home page with full resizable panel layout.
 * Composes top bar, bottom bar, and main three-column layout
 * with navigation, document viewer, and placeholder panels.
 *
 * @returns The full-page Home layout element
 * @complexity O(1) - composition of child components
 */
export const HomePage = (): React.ReactElement => {
  const { cycleTheme, getThemeIcon, getThemeLabel, resolvedTheme } =
    useUILibraryTheme('home-theme-mode');
  const { density, cycleDensity } = useDensity('home-density');
  const { contrastMode, cycleContrastMode } = useContrast('home-contrast', resolvedTheme);
  const { paneConfig, togglePane, handlePaneResize, resetLayout } =
    useUILibraryPanes('home-pane-config');
  const [selectedDoc, setSelectedDoc] = useState<DocKey | null>('readme');
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const authResult = useAuth();
  const user = authResult.user as { id?: string; email?: string; name?: string | null } | null;
  const { isAuthenticated, logout } = authResult;
  const { isOpen: sidePeekOpen, close: closeSidePeek } = useSidePeek();

  const { content, isLoading } = useDocContent(selectedDoc ?? 'readme');

  useHomeKeyboard({
    togglePane,
    cycleTheme,
    clearSelection: () => {
      setSelectedDoc(null);
    },
  });

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

  const handleSelectDoc = useCallback((key: DocKey): void => {
    setSelectedDoc(key);
  }, []);

  return (
    <>
      <div className="h-screen w-screen overflow-hidden">
        <ResizablePanelGroup direction="vertical">
          {/* Top Bar */}
          <HomeTopBar
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
            <HomeBottomBar
              size={paneConfig.bottom.size}
              visible={paneConfig.bottom.visible}
              onResize={handleBottomBarResize}
              cycleTheme={cycleTheme}
              getThemeIcon={getThemeIcon}
              getThemeLabel={getThemeLabel}
              cycleDensity={cycleDensity}
              getDensityLabel={getDensityLabel}
              cycleContrast={cycleContrastMode}
              getContrastLabel={getContrastLabel}
            />

            {/* Main Layout */}
            <HomeMainLayout
              paneConfig={paneConfig}
              togglePane={togglePane}
              handlePaneResize={handlePaneResize}
              resetLayout={resetLayout}
              selectedDoc={selectedDoc}
              onSelectDoc={handleSelectDoc}
              content={content}
              isLoading={isLoading}
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
          <Text tone="muted">Side peek content</Text>
        </SidePeek.Content>
      </SidePeek.Root>
    </>
  );
};
