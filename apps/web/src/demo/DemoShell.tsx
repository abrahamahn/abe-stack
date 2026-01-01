// apps/web/src/demo/DemoShell.tsx
import {
  Button,
  Heading,
  ResizablePanel,
  ResizablePanelGroup,
  ScrollArea,
  Text,
} from '@abe-stack/ui';
import React, { type ReactElement, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { getComponentDocs, parseMarkdown } from './docs';
import { getAllCategories, getComponentsByCategory } from './registry';

import type { ComponentDemo, DemoPaneConfig } from './types';

const DEFAULT_PANE_CONFIG: DemoPaneConfig = {
  top: { visible: true, size: 10 }, // %
  left: { visible: true, size: 18 }, // %
  right: { visible: true, size: 25 }, // %
  bottom: { visible: true, size: 15 }, // %
};

export const DemoShell: React.FC = () => {
  const navigate = useNavigate();
  const [paneConfig, setPaneConfig] = useState<DemoPaneConfig>(DEFAULT_PANE_CONFIG);
  const [activeCategory, setActiveCategory] = useState<string>('primitives');
  const [selectedComponent, setSelectedComponent] = useState<ComponentDemo | null>(null);

  const categories = getAllCategories();
  const componentsInCategory = getComponentsByCategory(activeCategory);

  const togglePane = (pane: keyof DemoPaneConfig): void => {
    setPaneConfig((prev) => ({
      ...prev,
      [pane]: { ...prev[pane], visible: !prev[pane].visible },
    }));
  };

  const handlePaneResize = (pane: keyof DemoPaneConfig, size: number): void => {
    setPaneConfig((prev) => ({
      ...prev,
      [pane]: { ...prev[pane], size },
    }));
  };

  const layoutToggles: Array<{ key: keyof DemoPaneConfig; label: string; icon: string }> = [
    { key: 'top', label: 'Top bar', icon: 'T' },
    { key: 'left', label: 'Left panel', icon: 'L' },
    { key: 'right', label: 'Right panel', icon: 'R' },
    { key: 'bottom', label: 'Bottom bar', icon: 'B' },
  ];
  const layoutBorder = 'var(--ui-layout-border, 1px solid var(--ui-color-border))';
  const closeButtonStyle = {
    textDecoration: 'none',
    padding: 0,
    minWidth: 'auto',
    alignSelf: 'flex-start',
    marginTop: '-2px',
    marginRight: '-4px',
    lineHeight: 1,
  };

  return (
    <div style={{ height: '100vh', width: '100vw', overflow: 'hidden' }}>
      <ResizablePanelGroup direction="vertical">
        {/* Top Bar */}
        <ResizablePanel
          defaultSize={paneConfig.top.size}
          minSize={6}
          maxSize={20}
          direction="vertical"
          collapsed={!paneConfig.top.visible}
          onResize={(size) => {
            handlePaneResize('top', size);
          }}
          style={{ borderBottom: layoutBorder, overflow: 'hidden' }}
          data-testid="demo-top-panel"
        >
          <div
            style={{
              height: '100%',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '0 16px',
              background: 'var(--ui-color-bg)',
            }}
          >
            <Button
              variant="text"
              size="small"
              onClick={() => {
                void navigate('/');
              }}
              aria-label="Back to home"
              style={{ minWidth: '88px' }}
            >
              ← Back
            </Button>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <Heading as="h1" size="lg">
                ABE Stack UI Component Gallery
              </Heading>
            </div>
            <div style={{ minWidth: '88px' }} />
          </div>
        </ResizablePanel>

        {/* Middle + Bottom Area */}
        <ResizablePanelGroup
          direction="vertical"
          style={{ flex: 1, minHeight: 0, flexDirection: 'column-reverse' }}
        >
          {/* Bottom Bar */}
          <ResizablePanel
            defaultSize={paneConfig.bottom.size}
            minSize={8}
            maxSize={25}
            direction="vertical"
            collapsed={!paneConfig.bottom.visible}
            invertResize
            onResize={(size) => {
              handlePaneResize('bottom', size);
            }}
            style={{ borderTop: layoutBorder, overflow: 'hidden' }}
            data-testid="demo-bottom-panel"
          >
            <div
              style={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                padding: '16px',
                background: 'var(--ui-color-bg)',
              }}
            >
              <Text tone="muted" style={{ fontSize: '14px' }}>
                💡 Theme follows your system's color scheme preference
              </Text>
            </div>
          </ResizablePanel>

          {/* Middle Area */}
          <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
            <ResizablePanelGroup direction="horizontal" style={{ flex: 1, minWidth: 0 }}>
              {/* Category Sidebar - Fixed Width */}
              <div
                style={{
                  width: '50px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  padding: '8px',
                  flexShrink: 0,
                  borderRight: layoutBorder,
                  background: 'var(--ui-color-bg)',
                }}
              >
                {categories.map((cat) => (
                  <Button
                    key={cat}
                    variant={activeCategory === cat ? 'primary' : 'secondary'}
                    onClick={() => {
                      setActiveCategory(cat);
                    }}
                    title={cat.charAt(0).toUpperCase() + cat.slice(1)}
                    style={{ width: '100%', height: '40px', padding: 0 }}
                  >
                    {cat.charAt(0).toUpperCase()}
                  </Button>
                ))}
                <div
                  style={{
                    marginTop: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    paddingTop: '8px',
                  }}
                >
                  {layoutToggles.map((toggle) => (
                    <Button
                      key={toggle.key}
                      variant={paneConfig[toggle.key].visible ? 'primary' : 'secondary'}
                      onClick={() => {
                        togglePane(toggle.key);
                      }}
                      title={`Toggle ${toggle.label}`}
                      aria-label={`Toggle ${toggle.label}`}
                      style={{ width: '100%', height: '36px', padding: 0 }}
                    >
                      {toggle.icon}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Left Sidebar - Component List */}
              <ResizablePanel
                defaultSize={paneConfig.left.size}
                minSize={10}
                maxSize={28}
                collapsed={!paneConfig.left.visible}
                onResize={(size) => {
                  handlePaneResize('left', size);
                }}
                style={{
                  background: 'var(--ui-color-bg)',
                }}
                data-testid="demo-left-panel"
              >
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    height: '100%',
                    borderRight: layoutBorder,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '16px',
                    }}
                  >
                    <Heading as="h2" size="md">
                      Components
                    </Heading>
                    <Button
                      size="small"
                      variant="text"
                      aria-label="Collapse left panel"
                      onClick={() => {
                        togglePane('left');
                      }}
                      style={closeButtonStyle}
                    >
                      ✕
                    </Button>
                  </div>
                  <ScrollArea style={{ flex: 1, minHeight: 0 }}>
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px',
                        padding: '8px',
                      }}
                    >
                      {componentsInCategory.map((comp) => (
                        <button
                          key={comp.id}
                          onClick={() => {
                            setSelectedComponent(comp);
                          }}
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '4px',
                            padding: '12px',
                            textAlign: 'left',
                            background:
                              selectedComponent?.id === comp.id
                                ? 'rgba(0,0,0,0.05)'
                                : 'transparent',
                            border: '1px solid transparent',
                            cursor: 'pointer',
                          }}
                        >
                          <Text>{comp.name}</Text>
                          <Text tone="muted" style={{ fontSize: '12px' }}>
                            {comp.variants.length} variant{comp.variants.length !== 1 ? 's' : ''}
                          </Text>
                        </button>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              </ResizablePanel>

              <ResizablePanelGroup
                direction="horizontal"
                style={{ flex: 1, minWidth: 0, flexDirection: 'row-reverse' }}
              >
                {/* Right Sidebar - Documentation */}
                <ResizablePanel
                  defaultSize={paneConfig.right.size}
                  minSize={5}
                  maxSize={100}
                  collapsed={!paneConfig.right.visible}
                  invertResize
                  onResize={(size) => {
                    handlePaneResize('right', size);
                  }}
                  style={{
                    background: 'var(--ui-color-bg)',
                  }}
                  data-testid="demo-right-panel"
                >
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      overflow: 'hidden',
                      height: '100%',
                      borderLeft: layoutBorder,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '16px',
                      }}
                    >
                      <Heading as="h2" size="md">
                        Documentation
                      </Heading>
                      <Button
                        size="small"
                        variant="text"
                        aria-label="Collapse right panel"
                        onClick={() => {
                          togglePane('right');
                        }}
                        style={closeButtonStyle}
                      >
                        ✕
                      </Button>
                    </div>
                    <div
                      style={{
                        padding: '16px',
                        overflowY: 'auto',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '16px',
                      }}
                    >
                      {selectedComponent ? (
                        <>
                          {((): ReactElement => {
                            const docs = getComponentDocs(
                              selectedComponent.id,
                              selectedComponent.category,
                              selectedComponent.name,
                            );
                            if (docs) {
                              return (
                                <div dangerouslySetInnerHTML={{ __html: parseMarkdown(docs) }} />
                              );
                            }
                            return (
                              <>
                                <section>
                                  <Heading as="h3" size="sm">
                                    Description
                                  </Heading>
                                  <Text>{selectedComponent.description}</Text>
                                </section>
                                <section>
                                  <Heading as="h3" size="sm">
                                    Category
                                  </Heading>
                                  <Text>{selectedComponent.category}</Text>
                                </section>
                                <section>
                                  <Heading as="h3" size="sm">
                                    Variants
                                  </Heading>
                                  <Text>{selectedComponent.variants.length} available</Text>
                                </section>
                              </>
                            );
                          })()}
                        </>
                      ) : (
                        <Text tone="muted">Select a component to view documentation</Text>
                      )}
                    </div>
                  </div>
                </ResizablePanel>

                {/* Center Panel - Main Render Area */}
                <div
                  style={{
                    flex: 1,
                    minWidth: 0,
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  <ScrollArea style={{ flex: 1, minHeight: 0 }}>
                    <div
                      style={{
                        minHeight: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '16px',
                        }}
                      >
                        <div>
                          <Heading as="h2" size="md">
                            {selectedComponent ? selectedComponent.name : 'Select a component'}
                          </Heading>
                          {selectedComponent && (
                            <Text tone="muted">{selectedComponent.description}</Text>
                          )}
                        </div>
                      </div>

                      {selectedComponent ? (
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
                            gap: '24px',
                            padding: '24px',
                            alignContent: 'start',
                          }}
                        >
                          {selectedComponent.variants.map((variant, idx) => (
                            <div
                              key={idx}
                              style={{
                                border: '1px solid currentColor',
                                borderRadius: '8px',
                                padding: '16px',
                              }}
                            >
                              <div
                                style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  marginBottom: '16px',
                                }}
                              >
                                <div>
                                  <Heading as="h3" size="sm">
                                    {variant.name}
                                  </Heading>
                                  <Text tone="muted" style={{ fontSize: '14px' }}>
                                    {variant.description}
                                  </Text>
                                </div>
                                <Button
                                  size="small"
                                  variant="text"
                                  className="demo-copy-button"
                                  onClick={() => {
                                    void navigator.clipboard.writeText(variant.code);
                                  }}
                                  title="Copy code"
                                >
                                  📋
                                </Button>
                              </div>
                              <div
                                style={{
                                  padding: '24px',
                                  border: '1px dashed currentColor',
                                  borderRadius: '4px',
                                  marginBottom: '16px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  minHeight: '80px',
                                  gap: '16px',
                                  flexWrap: 'wrap',
                                }}
                              >
                                {variant.render()}
                              </div>
                              <details style={{ marginTop: '16px' }}>
                                <summary style={{ cursor: 'pointer', padding: '8px' }}>
                                  View Code
                                </summary>
                                <pre
                                  style={{ margin: '8px 0 0', padding: '12px', overflowX: 'auto' }}
                                >
                                  <code>{variant.code}</code>
                                </pre>
                              </details>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            height: '100%',
                            padding: '48px',
                            textAlign: 'center',
                          }}
                        >
                          <Text tone="muted">
                            Select a component from the left sidebar to view demos
                          </Text>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </div>
              </ResizablePanelGroup>
            </ResizablePanelGroup>
          </div>
        </ResizablePanelGroup>
      </ResizablePanelGroup>
    </div>
  );
};
