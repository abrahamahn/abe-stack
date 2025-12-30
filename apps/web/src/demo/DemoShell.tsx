// apps/web/src/demo/DemoShell.tsx
import { Button, Heading, ResizablePanel, ResizablePanelGroup, Text } from '@abe-stack/ui';
import React, { useState } from 'react';

import { getAllCategories, getComponentsByCategory } from './registry';

import type { ComponentDemo, DemoPaneConfig } from './types';

import './DemoShell.css';

const DEFAULT_PANE_CONFIG: DemoPaneConfig = {
  top: { visible: true, size: 10 },
  left: { visible: true, size: 20 },
  right: { visible: true, size: 25 },
  bottom: { visible: true, size: 15 },
};

export const DemoShell: React.FC = () => {
  const [paneConfig, setPaneConfig] = useState<DemoPaneConfig>(DEFAULT_PANE_CONFIG);
  const [activeCategory, setActiveCategory] = useState<string>('primitives');
  const [selectedComponent, setSelectedComponent] = useState<ComponentDemo | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

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

  return (
    <div className={`demo-shell demo-shell-theme-${theme}`} style={{ height: '100vh' }}>
      {/* Top Bar */}
      {paneConfig.top.visible && (
        <div
          className="demo-pane demo-pane-top"
          style={{ height: `${String(paneConfig.top.size)}vh` }}
        >
          <div className="demo-pane-header">
            <Heading as="h1" size="lg">
              ABE Stack UI Component Gallery
            </Heading>
            <div className="demo-pane-controls">
              <Button
                size="small"
                variant="text"
                onClick={() => {
                  togglePane('top');
                }}
              >
                ✕
              </Button>
            </div>
          </div>

          {/* Category Tabs */}
          <div className="demo-category-tabs">
            {categories.map((cat) => (
              <button
                key={cat}
                className={`demo-tab ${activeCategory === cat ? 'active' : ''}`}
                onClick={() => {
                  setActiveCategory(cat);
                }}
              >
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div
        className="demo-main-container"
        style={{ height: `${String(100 - paneConfig.top.size)}vh` }}
      >
        <ResizablePanelGroup direction="horizontal">
          {/* Left Sidebar - Component List */}
          {paneConfig.left.visible && (
            <ResizablePanel
              defaultSize={paneConfig.left.size}
              minSize={15}
              maxSize={40}
              onResize={(size: number) => {
                handlePaneResize('left', size);
              }}
            >
              <div className="demo-pane demo-pane-left">
                <div className="demo-pane-header">
                  <Heading as="h2" size="md">
                    Components
                  </Heading>
                  <Button
                    size="small"
                    variant="text"
                    onClick={() => {
                      togglePane('left');
                    }}
                  >
                    ✕
                  </Button>
                </div>
                <div className="demo-component-list">
                  {componentsInCategory.map((comp) => (
                    <button
                      key={comp.id}
                      className={`demo-component-item ${selectedComponent?.id === comp.id ? 'active' : ''}`}
                      onClick={() => {
                        setSelectedComponent(comp);
                      }}
                    >
                      <Text>{comp.name}</Text>
                      <Text tone="muted" style={{ fontSize: '12px' }}>
                        {String(comp.variants.length)} variant
                        {comp.variants.length !== 1 ? 's' : ''}
                      </Text>
                    </button>
                  ))}
                </div>
              </div>
            </ResizablePanel>
          )}

          {/* Center Panel - Main Render Area */}
          <div className="demo-pane demo-pane-center" style={{ flex: 1, overflow: 'auto' }}>
            <div className="demo-pane-header">
              <div>
                <Heading as="h2" size="md">
                  {selectedComponent ? selectedComponent.name : 'Select a component'}
                </Heading>
                {selectedComponent && <Text tone="muted">{selectedComponent.description}</Text>}
              </div>
              <div className="demo-pane-controls">
                {!paneConfig.left.visible && (
                  <Button
                    size="small"
                    variant="secondary"
                    onClick={() => {
                      togglePane('left');
                    }}
                  >
                    ☰ List
                  </Button>
                )}
                {!paneConfig.right.visible && (
                  <Button
                    size="small"
                    variant="secondary"
                    onClick={() => {
                      togglePane('right');
                    }}
                  >
                    📖 Docs
                  </Button>
                )}
                {!paneConfig.bottom.visible && (
                  <Button
                    size="small"
                    variant="secondary"
                    onClick={() => {
                      togglePane('bottom');
                    }}
                  >
                    🎨 Theme
                  </Button>
                )}
              </div>
            </div>

            {selectedComponent ? (
              <div className="demo-variants-container">
                {selectedComponent.variants.map((variant, idx) => (
                  <div key={idx} className="demo-variant-card">
                    <div className="demo-variant-header">
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
                        onClick={() => {
                          void navigator.clipboard.writeText(variant.code);
                        }}
                        title="Copy code"
                      >
                        📋
                      </Button>
                    </div>
                    <div className="demo-variant-render">{variant.render()}</div>
                    <details className="demo-variant-code">
                      <summary>View Code</summary>
                      <pre>
                        <code>{variant.code}</code>
                      </pre>
                    </details>
                  </div>
                ))}
              </div>
            ) : (
              <div className="demo-empty-state">
                <Text tone="muted">Select a component from the left sidebar to view demos</Text>
              </div>
            )}
          </div>

          {/* Right Sidebar - Documentation */}
          {paneConfig.right.visible && (
            <ResizablePanel
              defaultSize={paneConfig.right.size}
              minSize={15}
              maxSize={40}
              onResize={(size: number) => {
                handlePaneResize('right', size);
              }}
            >
              <div className="demo-pane demo-pane-right">
                <div className="demo-pane-header">
                  <Heading as="h2" size="md">
                    Documentation
                  </Heading>
                  <Button
                    size="small"
                    variant="text"
                    onClick={() => {
                      togglePane('right');
                    }}
                  >
                    ✕
                  </Button>
                </div>
                <div className="demo-docs-content">
                  {selectedComponent ? (
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
                      {selectedComponent.relatedDocs && (
                        <section>
                          <Heading as="h3" size="sm">
                            Related Documentation
                          </Heading>
                          <ul>
                            {selectedComponent.relatedDocs.map((doc, idx) => (
                              <li key={idx}>
                                <Text>{doc}</Text>
                              </li>
                            ))}
                          </ul>
                        </section>
                      )}
                    </>
                  ) : (
                    <Text tone="muted">Select a component to view documentation</Text>
                  )}
                </div>
              </div>
            </ResizablePanel>
          )}
        </ResizablePanelGroup>
      </div>

      {/* Bottom Panel - Theme Controls */}
      {paneConfig.bottom.visible && (
        <div
          className="demo-pane demo-pane-bottom"
          style={{ height: `${String(paneConfig.bottom.size)}vh` }}
        >
          <div className="demo-pane-header">
            <Heading as="h3" size="sm">
              Theme Controls
            </Heading>
            <Button
              size="small"
              variant="text"
              onClick={() => {
                togglePane('bottom');
              }}
            >
              ✕
            </Button>
          </div>
          <div className="demo-theme-controls">
            <div className="demo-theme-control">
              <Text>Theme:</Text>
              <div className="demo-theme-buttons">
                <Button
                  size="small"
                  variant={theme === 'light' ? 'primary' : 'secondary'}
                  onClick={() => {
                    setTheme('light');
                  }}
                >
                  ☀️ Light
                </Button>
                <Button
                  size="small"
                  variant={theme === 'dark' ? 'primary' : 'secondary'}
                  onClick={() => {
                    setTheme('dark');
                  }}
                >
                  🌙 Dark
                </Button>
              </div>
            </div>
            <div className="demo-theme-control">
              <Text>Panel Visibility:</Text>
              <div className="demo-theme-buttons">
                <Button
                  size="small"
                  variant={paneConfig.top.visible ? 'primary' : 'secondary'}
                  onClick={() => {
                    togglePane('top');
                  }}
                >
                  Top
                </Button>
                <Button
                  size="small"
                  variant={paneConfig.left.visible ? 'primary' : 'secondary'}
                  onClick={() => {
                    togglePane('left');
                  }}
                >
                  Left
                </Button>
                <Button
                  size="small"
                  variant={paneConfig.right.visible ? 'primary' : 'secondary'}
                  onClick={() => {
                    togglePane('right');
                  }}
                >
                  Right
                </Button>
                <Button
                  size="small"
                  variant="primary"
                  onClick={() => {
                    togglePane('bottom');
                  }}
                >
                  Bottom
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
