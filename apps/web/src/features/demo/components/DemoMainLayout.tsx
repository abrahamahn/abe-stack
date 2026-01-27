// apps/web/src/features/demo/components/DemoMainLayout.tsx
import {
  Button,
  CloseButton,
  Heading,
  MenuItem,
  ResizablePanel,
  ResizablePanelGroup,
  ScrollArea,
  Text,
} from '@abe-stack/ui';
import { DemoDocContent, DemoPreviewArea } from '@demo/components';

import type { ComponentDemo, DemoPaneConfig } from '@demo/types';
import type { ReactElement } from 'react';

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

export interface DemoMainLayoutProps {
  paneConfig: DemoPaneConfig;
  togglePane: (pane: keyof DemoPaneConfig) => void;
  handlePaneResize: (pane: keyof DemoPaneConfig, size: number) => void;
  resetLayout: () => void;
  categories: string[];
  activeCategory: string;
  setActiveCategory: (category: string) => void;
  componentsInCategory: ComponentDemo[];
  selectedComponent: ComponentDemo | null;
  setSelectedComponent: (component: ComponentDemo | null) => void;
}

export const DemoMainLayout = ({
  paneConfig,
  togglePane,
  handlePaneResize,
  resetLayout,
  categories,
  activeCategory,
  setActiveCategory,
  componentsInCategory,
  selectedComponent,
  setSelectedComponent,
}: DemoMainLayoutProps): ReactElement => {
  return (
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
          <div className="panel border-r relative">
            <span className="layout-label">LeftSidebarLayout</span>
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
                {componentsInCategory.map((comp) => (
                  <MenuItem
                    key={comp.id}
                    onClick={() => {
                      setSelectedComponent(comp);
                    }}
                    data-selected={selectedComponent?.id === comp.id}
                  >
                    <Text>{comp.name}</Text>
                    <Text tone="muted" className="text-xs">
                      {comp.variants.length} variant{comp.variants.length !== 1 ? 's' : ''}
                    </Text>
                  </MenuItem>
                ))}
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
            <div className="panel border-l relative">
              <span className="layout-label">RightSidebarLayout</span>
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
                {selectedComponent !== null ? (
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
  );
};
