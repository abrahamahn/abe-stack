// apps/web/src/features/demo/pages/DemoPage.tsx
import { Button, Heading, ResizablePanelGroup, SidePeek, Text, useSidePeek } from '@abe-stack/ui';
import { AuthModal } from '@auth/components';
import { useAuth } from '@auth/hooks';
import { getAllCategories, getComponentsByCategory, getTotalComponentCount } from '@catalog/index';
import { DemoBottomBar, DemoMainLayout, DemoTopBar } from '@demo/components';
import { useDemoKeyboard, useDemoPanes, useDemoTheme } from '@demo/hooks';
import { useCallback, useMemo, useState } from 'react';

import type { AuthMode } from '@auth/components/AuthForms';
import type { ComponentDemo } from '@demo/types';

export function DemoPage(): React.ReactElement {
  const { cycleTheme, getThemeIcon, getThemeLabel } = useDemoTheme();
  const { paneConfig, togglePane, handlePaneResize, resetLayout } = useDemoPanes();
  const [activeCategory, setActiveCategory] = useState<string>('elements');
  const [selectedComponent, setSelectedComponent] = useState<ComponentDemo | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const { user, isAuthenticated, logout } = useAuth();
  const { isOpen: sidePeekOpen, peekPath, close: closeSidePeek } = useSidePeek();

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
            <SidePeek.Expand to={peekPath ?? '/demo'} />
            <SidePeek.Close />
          </div>
        </SidePeek.Header>
        <SidePeek.Content>
          <div className="space-y-4">
            <Text>
              This is a <strong>Notion-style side peek</strong> panel. It slides in from the right
              and keeps the background visible.
            </Text>

            <Heading as="h3" size="md">
              Features
            </Heading>
            <ul className="list-disc list-inside space-y-2">
              <li>URL-synced state (try refreshing!)</li>
              <li>Smooth CSS transitions</li>
              <li>Click overlay or press Escape to close</li>
              <li>Expand button to open in full page</li>
              <li>Multiple size variants (sm, md, lg, xl, full)</li>
              <li>Focus trap for accessibility</li>
            </ul>

            <Heading as="h3" size="md">
              Usage
            </Heading>
            <pre className="bg-black/10 p-4 rounded text-sm overflow-auto">
              {`import { SidePeek, useSidePeek } from '@abe-stack/ui';

const { isOpen, open, close } = useSidePeek();

<button onClick={() => open('/details')}>
  Open Side Peek
</button>

<SidePeek.Root open={isOpen} onClose={close}>
  <SidePeek.Header>
    <SidePeek.Title>Title</SidePeek.Title>
    <SidePeek.Close />
  </SidePeek.Header>
  <SidePeek.Content>
    Your content here
  </SidePeek.Content>
</SidePeek.Root>`}
            </pre>

            <div className="pt-4">
              <Button variant="primary" onClick={closeSidePeek}>
                Close this panel
              </Button>
            </div>
          </div>
        </SidePeek.Content>
      </SidePeek.Root>
    </>
  );
}
