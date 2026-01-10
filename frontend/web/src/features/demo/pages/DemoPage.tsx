// apps/web/src/features/demo/pages/DemoPage.tsx
import { config } from '@config';
import {
  Button,
  CloseButton,
  EnvironmentBadge,
  Heading,
  Kbd,
  ResizablePanel,
  ResizablePanelGroup,
  ScrollArea,
  Spinner,
  Text,
  VersionBadge,
} from '@ui';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { DemoDocContent, DemoPreviewArea } from '../components';
import {
  KEYBOARD_SHORTCUTS,
  useDemoKeyboard,
  useDemoPanes,
  useDemoTheme,
  useLazyCatalog,
} from '../hooks';

import type { DemoPaneConfig } from '../types';
import type { ComponentDemo } from '../types';

type LayoutToggle = {
  key: keyof DemoPaneConfig;
  label: string;
  icon: string;
};

const LAYOUT_TOGGLES: LayoutToggle[] = [
  { key: 'top', label: 'Top bar', icon: 'T' },
  { key: 'left', label: 'Left panel', icon: 'L' },
  { key: 'right', label: 'Right panel', icon: 'R' },
  { key: 'bottom', label: 'Bottom bar', icon: 'B' },
];

export function DemoPage(): React.ReactElement {
  const navigate = useNavigate();
  const { cycleTheme, getThemeIcon, getThemeLabel } = useDemoTheme();
  const { paneConfig, togglePane, handlePaneResize, resetLayout } = useDemoPanes();
  const [selectedComponent, setSelectedComponent] = useState<ComponentDemo | null>(null);

  // Use lazy loading for catalog
  const {
    components: componentsInCategory,
    isLoading,
    categories,
    activeCategory,
    setActiveCategory,
    totalLoaded,
    preload,
  } = useLazyCatalog('elements');

  useDemoKeyboard({
    togglePane,
    cycleTheme,
    clearSelection: () => {
      setSelectedComponent(null);
    },
  });

  // Preload adjacent categories for smoother navigation
  useEffect(() => {
    const categoryIndex = categories.indexOf(activeCategory);
    // Preload next category
    const nextCategory = categories[categoryIndex + 1];
    if (categoryIndex < categories.length - 1 && nextCategory) {
      preload(nextCategory);
    }
    // Preload previous category
    const prevCategory = categories[categoryIndex - 1];
    if (categoryIndex > 0 && prevCategory) {
      preload(prevCategory);
    }
  }, [activeCategory, categories, preload]);

  return (
    <div className="h-screen w-screen overflow-hidden">
      <ResizablePanelGroup direction="vertical">
        {/* Top Bar */}
        <ResizablePanel
          size={paneConfig.top.size}
          minSize={6}
          maxSize={20}
          direction="vertical"
          collapsed={!paneConfig.top.visible}
          onResize={(size: number) => {
            handlePaneResize('top', size);
          }}
          className="border-b overflow-hidden"
          data-testid="demo-top-panel"
        >
          <div className="bar border-b">
            <div style={{ width: '5.5rem' }}>
              <Button
                variant="text"
                size="small"
                onClick={() => {
                  void navigate('/');
                }}
                aria-label="Back to home"
              >
                ← Back
              </Button>
            </div>
            <div
              className="flex-1"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <Heading as="h1" size="lg" style={{ margin: 0 }}>
                ABE Stack UI Component Gallery
              </Heading>
            </div>
            <div style={{ width: '5.5rem' }} />
          </div>
        </ResizablePanel>

        {/* Middle + Bottom Area */}
        <ResizablePanelGroup direction="vertical" reverse className="flex-1 min-h-0">
          {/* Bottom Bar */}
          <ResizablePanel
            size={paneConfig.bottom.size}
            minSize={4}
            maxSize={20}
            direction="vertical"
            invertResize
            collapsed={!paneConfig.bottom.visible}
            onResize={(size: number) => {
              handlePaneResize('bottom', size);
            }}
            className="border-t overflow-hidden"
            data-testid="demo-bottom-panel"
          >
            <div className="bar">
              {/* Left: Version & Environment */}
              <div className="bar-section">
                <VersionBadge version={config.uiVersion} />
                <EnvironmentBadge environment={config.isDev ? 'development' : 'production'} />
                <Text tone="muted" className="text-xs hide-mobile">
                  {totalLoaded} components loaded
                </Text>
              </div>

              {/* Center: Keyboard Shortcuts (desktop only) */}
              <div className="hide-mobile flex gap-4">
                {KEYBOARD_SHORTCUTS.map((shortcut) => (
                  <Text key={shortcut.key} tone="muted" className="text-2xs">
                    <Kbd size="sm">{shortcut.key}</Kbd> {shortcut.description}
                  </Text>
                ))}
              </div>

              {/* Right: Theme Toggle */}
              <Button
                variant="secondary"
                size="small"
                onClick={cycleTheme}
                title={`Theme: ${getThemeLabel()} (click to change)`}
                aria-label={`Theme: ${getThemeLabel()}, click to change`}
                className="flex items-center gap-2 p-1 px-2"
              >
                <span>{getThemeIcon()}</span>
                <span className="text-xs hide-mobile">{getThemeLabel()}</span>
              </Button>
            </div>
          </ResizablePanel>

          {/* Middle Area */}
          <div className="flex-1 min-h-0 flex">
            <ResizablePanelGroup direction="horizontal" className="flex-1 min-w-0">
              {/* Category Sidebar - Fixed Width */}
              <div className="sidebar border-r">
                {categories.map((cat) => (
                  <Button
                    key={cat}
                    variant={activeCategory === cat ? 'primary' : 'secondary'}
                    onClick={() => {
                      setActiveCategory(cat);
                    }}
                    title={cat.charAt(0).toUpperCase() + cat.slice(1)}
                    className="sidebar-btn"
                  >
                    {cat.charAt(0).toUpperCase()}
                  </Button>
                ))}
                <div className="spacer">
                  {LAYOUT_TOGGLES.map((toggle) => (
                    <Button
                      key={toggle.key}
                      variant={paneConfig[toggle.key].visible ? 'primary' : 'secondary'}
                      onClick={() => {
                        togglePane(toggle.key);
                      }}
                      title={`Toggle ${toggle.label}`}
                      aria-label={`Toggle ${toggle.label}`}
                      className="sidebar-btn sidebar-btn-sm"
                    >
                      {toggle.icon}
                    </Button>
                  ))}
                  <Button
                    variant="secondary"
                    onClick={resetLayout}
                    title="Reset layout"
                    aria-label="Reset layout"
                    className="sidebar-btn sidebar-btn-sm mt-1"
                  >
                    ↺
                  </Button>
                </div>
              </div>

              {/* Left Sidebar - Component List */}
              <ResizablePanel
                size={paneConfig.left.size}
                minSize={10}
                maxSize={28}
                collapsed={!paneConfig.left.visible}
                onResize={(size: number) => {
                  handlePaneResize('left', size);
                }}
                className="bg-primary"
                data-testid="demo-left-panel"
              >
                <div className="panel border-r">
                  <div className="panel-header">
                    <Heading as="h2" size="md">
                      Components
                    </Heading>
                    <CloseButton
                      aria-label="Collapse left panel"
                      onClick={() => {
                        togglePane('left');
                      }}
                    />
                  </div>
                  <ScrollArea className="scroll-flex">
                    <div className="flex-col gap-1 p-2">
                      {isLoading ? (
                        <div className="flex items-center justify-center p-4">
                          <Spinner size="sm" />
                        </div>
                      ) : (
                        componentsInCategory.map((comp) => (
                          <button
                            key={comp.id}
                            onClick={() => {
                              setSelectedComponent(comp);
                            }}
                            className="menu-item"
                            data-selected={selectedComponent?.id === comp.id}
                          >
                            <Text>{comp.name}</Text>
                            <Text tone="muted" className="text-xs">
                              {comp.variants.length} variant{comp.variants.length !== 1 ? 's' : ''}
                            </Text>
                          </button>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </div>
              </ResizablePanel>

              <ResizablePanelGroup direction="horizontal" reverse className="flex-1 min-w-0">
                {/* Right Sidebar - Documentation */}
                <ResizablePanel
                  size={paneConfig.right.size}
                  minSize={5}
                  maxSize={100}
                  invertResize
                  collapsed={!paneConfig.right.visible}
                  onResize={(size: number) => {
                    handlePaneResize('right', size);
                  }}
                  className="bg-primary"
                  data-testid="demo-right-panel"
                >
                  <div className="panel border-l">
                    <div className="panel-header">
                      <Heading as="h2" size="md">
                        Documentation
                      </Heading>
                      <CloseButton
                        aria-label="Collapse right panel"
                        onClick={() => {
                          togglePane('right');
                        }}
                      />
                    </div>
                    <div className="panel-content">
                      {selectedComponent ? (
                        <DemoDocContent component={selectedComponent} />
                      ) : (
                        <Text tone="muted">Select a component to view documentation</Text>
                      )}
                    </div>
                  </div>
                </ResizablePanel>

                {/* Center Panel - Main Render Area */}
                <DemoPreviewArea selectedComponent={selectedComponent} />
              </ResizablePanelGroup>
            </ResizablePanelGroup>
          </div>
        </ResizablePanelGroup>
      </ResizablePanelGroup>
    </div>
  );
}
