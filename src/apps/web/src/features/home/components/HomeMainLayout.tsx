// apps/web/src/features/home/components/HomeMainLayout.tsx
import {
  Button,
  CloseButton,
  Heading,
  ResizablePanel,
  ResizablePanelGroup,
  ScrollArea,
  Text,
} from '@abe-stack/ui';

import { HomeDocViewer } from './HomeDocViewer';
import { HomeNavList } from './HomeNavList';

import type { DocKey, HomePaneConfig } from '../types';
import type { ReactElement } from 'react';

type LayoutToggle = {
  key: keyof HomePaneConfig;
  label: string;
  icon: string;
};

const LAYOUT_TOGGLES: LayoutToggle[] = [
  { key: 'top', label: 'Top bar', icon: 'T' },
  { key: 'left', label: 'Left panel', icon: 'L' },
  { key: 'right', label: 'Right panel', icon: 'R' },
  { key: 'bottom', label: 'Bottom bar', icon: 'B' },
];

/** Props for the HomeMainLayout component. */
export interface HomeMainLayoutProps {
  /** Current pane visibility and size configuration */
  paneConfig: HomePaneConfig;
  /** Toggle visibility of a specific pane */
  togglePane: (pane: keyof HomePaneConfig) => void;
  /** Update the size of a specific pane after drag resize */
  handlePaneResize: (pane: keyof HomePaneConfig, size: number) => void;
  /** Reset all panes to default layout */
  resetLayout: () => void;
  /** Currently selected document key */
  selectedDoc: DocKey | null;
  /** Callback when a document is selected */
  onSelectDoc: (key: DocKey) => void;
  /** Loaded markdown content */
  content: string | null;
  /** Whether content is currently being fetched */
  isLoading: boolean;
}

/**
 * Main three-column layout for the Home page.
 * Composed of a fixed sidebar with toggle buttons, a left nav panel,
 * a center document viewer, and a right placeholder panel.
 *
 * @param props - HomeMainLayoutProps
 * @returns Horizontal resizable panel layout element
 * @complexity O(n) where n = number of layout toggles + nav items (bounded constants)
 */
export const HomeMainLayout = ({
  paneConfig,
  togglePane,
  handlePaneResize,
  resetLayout,
  selectedDoc,
  onSelectDoc,
  content,
  isLoading,
}: HomeMainLayoutProps): ReactElement => {
  return (
    <div className="flex-1 min-h-0 flex">
      <ResizablePanelGroup direction="horizontal" className="flex-1 min-w-0">
        {/* Fixed Sidebar with Toggle Buttons */}
        <div className="sidebar border-r">
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

        {/* Left Panel - Navigation */}
        <ResizablePanel
          size={paneConfig.left.size}
          minSize={10}
          maxSize={28}
          collapsed={!paneConfig.left.visible}
          onResize={(size: number) => {
            handlePaneResize('left', size);
          }}
          className="bg-primary"
          data-testid="home-left-panel"
        >
          <div className="panel border-r relative">
            <span className="layout-label">LeftSidebarLayout</span>
            <div className="panel-header">
              <Heading as="h2" size="md">
                Navigation
              </Heading>
              <CloseButton
                aria-label="Collapse left panel"
                onClick={() => {
                  togglePane('left');
                }}
              />
            </div>
            <HomeNavList activeDoc={selectedDoc ?? 'readme'} onSelectDoc={onSelectDoc} />
          </div>
        </ResizablePanel>

        <ResizablePanelGroup direction="horizontal" reverse className="flex-1 min-w-0">
          {/* Right Panel - Empty Placeholder */}
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
            data-testid="home-right-panel"
          >
            <div className="panel border-l relative">
              <span className="layout-label">RightSidebarLayout</span>
              <div className="panel-header">
                <Heading as="h2" size="md">
                  Details
                </Heading>
                <CloseButton
                  aria-label="Collapse right panel"
                  onClick={() => {
                    togglePane('right');
                  }}
                />
              </div>
              <div className="panel-content">
                <Text tone="muted">Right panel placeholder</Text>
              </div>
            </div>
          </ResizablePanel>

          {/* Center Panel - Doc Viewer */}
          <ScrollArea className="flex-1 min-w-0">
            <HomeDocViewer selectedDoc={selectedDoc} content={content} isLoading={isLoading} />
          </ScrollArea>
        </ResizablePanelGroup>
      </ResizablePanelGroup>
    </div>
  );
};
