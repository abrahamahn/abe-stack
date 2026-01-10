import { ResizablePanel, ResizablePanelGroup } from '@ui';
import { useState } from 'react';

import {
  DemoBottomBar,
  DemoCategorySidebar,
  DemoComponentList,
  DemoDocPanel,
  DemoPreviewArea,
  DemoToolbar,
} from './components';
import { useDemoKeyboard, useDemoPanes, useDemoTheme } from './hooks';
import { getAllCategories, getComponentsByCategory, getTotalComponentCount } from './registry';

import type { ComponentDemo } from './types';

const LAYOUT_BORDER = 'var(--ui-layout-border, 1px solid var(--ui-color-border))';

export function DemoShell(): React.ReactElement {
  const { cycleTheme, getThemeIcon, getThemeLabel } = useDemoTheme();
  const { paneConfig, isMobile, togglePane, handlePaneResize, resetLayout } = useDemoPanes();
  const [activeCategory, setActiveCategory] = useState<string>('elements');
  const [selectedComponent, setSelectedComponent] = useState<ComponentDemo | null>(null);

  useDemoKeyboard({
    togglePane,
    cycleTheme,
    clearSelection: () => {
      setSelectedComponent(null);
    },
  });

  const categories = getAllCategories();
  const componentsInCategory = getComponentsByCategory(activeCategory);
  const totalComponents = getTotalComponentCount();

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
          onResize={(size) => {
            handlePaneResize('top', size);
          }}
          style={{ borderBottom: LAYOUT_BORDER, overflow: 'hidden' }}
          data-testid="demo-top-panel"
        >
          <DemoToolbar layoutBorder={LAYOUT_BORDER} />
        </ResizablePanel>

        {/* Middle + Bottom Area */}
        <ResizablePanelGroup
          direction="vertical"
          style={{ flex: 1, minHeight: 0, flexDirection: 'column-reverse' }}
        >
          {/* Bottom Bar */}
          <ResizablePanel
            size={paneConfig.bottom.size}
            minSize={4}
            maxSize={20}
            direction="vertical"
            collapsed={!paneConfig.bottom.visible}
            invertResize
            onResize={(size) => {
              handlePaneResize('bottom', size);
            }}
            style={{ borderTop: LAYOUT_BORDER, overflow: 'hidden' }}
            data-testid="demo-bottom-panel"
          >
            <DemoBottomBar
              totalComponents={totalComponents}
              isMobile={isMobile}
              themeLabel={getThemeLabel()}
              themeIcon={getThemeIcon()}
              onCycleTheme={cycleTheme}
            />
          </ResizablePanel>

          {/* Middle Area */}
          <div className="flex-1 min-h-0 d-flex">
            <ResizablePanelGroup direction="horizontal" className="flex-1 min-w-0">
              {/* Category Sidebar - Fixed Width */}
              <DemoCategorySidebar
                categories={categories}
                activeCategory={activeCategory}
                paneConfig={paneConfig}
                isMobile={isMobile}
                layoutBorder={LAYOUT_BORDER}
                onCategoryChange={setActiveCategory}
                onTogglePane={togglePane}
                onResetLayout={resetLayout}
              />

              {/* Left Sidebar - Component List */}
              <ResizablePanel
                size={paneConfig.left.size}
                minSize={10}
                maxSize={28}
                collapsed={!paneConfig.left.visible}
                onResize={(size) => {
                  handlePaneResize('left', size);
                }}
                style={{ background: 'var(--ui-color-bg)' }}
                data-testid="demo-left-panel"
              >
                <DemoComponentList
                  components={componentsInCategory}
                  selectedComponent={selectedComponent}
                  layoutBorder={LAYOUT_BORDER}
                  onSelectComponent={setSelectedComponent}
                  onClose={() => {
                    togglePane('left');
                  }}
                />
              </ResizablePanel>

              <ResizablePanelGroup
                direction="horizontal"
                style={{ flex: 1, minWidth: 0, flexDirection: 'row-reverse' }}
              >
                {/* Right Sidebar - Documentation */}
                <ResizablePanel
                  size={paneConfig.right.size}
                  minSize={5}
                  maxSize={100}
                  collapsed={!paneConfig.right.visible}
                  invertResize
                  onResize={(size) => {
                    handlePaneResize('right', size);
                  }}
                  style={{ background: 'var(--ui-color-bg)' }}
                  data-testid="demo-right-panel"
                >
                  <DemoDocPanel
                    selectedComponent={selectedComponent}
                    layoutBorder={LAYOUT_BORDER}
                    onClose={() => {
                      togglePane('right');
                    }}
                  />
                </ResizablePanel>

                {/* Center Panel - Main Render Area */}
                <DemoPreviewArea selectedComponent={selectedComponent} isMobile={isMobile} />
              </ResizablePanelGroup>
            </ResizablePanelGroup>
          </div>
        </ResizablePanelGroup>
      </ResizablePanelGroup>
    </div>
  );
}
