// apps/web/src/features/demo/DemoShell.tsx
import {
  Button,
  Heading,
  ResizablePanel,
  ResizablePanelGroup,
  ScrollArea,
  Text,
  useLocalStorage,
  useMediaQuery,
} from '@abe-stack/ui';
import React, { type ReactElement, useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { getComponentDocs, parseMarkdown } from './docs';
import { getAllCategories, getComponentsByCategory, getTotalComponentCount } from './registry';

import type { ComponentDemo, DemoPaneConfig } from './types';

type ThemeMode = 'system' | 'light' | 'dark';

// Version from package - in a real app, inject via build process
const UI_VERSION = '1.1.0';
const ENV = import.meta.env.MODE;

const DEFAULT_PANE_CONFIG: DemoPaneConfig = {
  top: { visible: true, size: 10 }, // %
  left: { visible: true, size: 18 }, // %
  right: { visible: true, size: 25 }, // %
  bottom: { visible: true, size: 8 }, // %
};

const MOBILE_PANE_CONFIG: DemoPaneConfig = {
  top: { visible: true, size: 10 },
  left: { visible: false, size: 18 },
  right: { visible: false, size: 25 },
  bottom: { visible: true, size: 8 },
};

const KEYBOARD_SHORTCUTS = [
  { key: 'L', description: 'Toggle left panel' },
  { key: 'R', description: 'Toggle right panel' },
  { key: 'T', description: 'Cycle theme' },
  { key: 'Esc', description: 'Deselect component' },
] as const;

export const DemoShell: React.FC = () => {
  const navigate = useNavigate();
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [paneConfig, setPaneConfig] = useLocalStorage<DemoPaneConfig>(
    'demo-pane-config',
    DEFAULT_PANE_CONFIG,
  );
  const [themeMode, setThemeMode] = useLocalStorage<ThemeMode>('demo-theme-mode', 'system');
  const [activeCategory, setActiveCategory] = useState<string>('elements');
  const [selectedComponent, setSelectedComponent] = useState<ComponentDemo | null>(null);
  const [hasInitialized, setHasInitialized] = useState(false);

  // Apply mobile defaults on first load if on mobile
  useEffect(() => {
    if (!hasInitialized && isMobile) {
      setPaneConfig(MOBILE_PANE_CONFIG);
    }
    setHasInitialized(true);
  }, [isMobile, hasInitialized, setPaneConfig]);

  // Apply theme mode to document
  useEffect(() => {
    const root = document.documentElement;
    root.removeAttribute('data-theme');

    if (themeMode === 'light') {
      root.setAttribute('data-theme', 'light');
    } else if (themeMode === 'dark') {
      root.setAttribute('data-theme', 'dark');
    }
    // 'system' = no attribute, CSS handles it via prefers-color-scheme
  }, [themeMode]);

  const cycleTheme = (): void => {
    setThemeMode((prev) => {
      if (prev === 'system') return 'light';
      if (prev === 'light') return 'dark';
      return 'system';
    });
  };

  const getThemeIcon = (): string => {
    if (themeMode === 'light') return '☀️';
    if (themeMode === 'dark') return '🌙';
    return '💻';
  };

  const getThemeLabel = (): string => {
    if (themeMode === 'light') return 'Light';
    if (themeMode === 'dark') return 'Dark';
    return 'System';
  };

  const resetLayout = (): void => {
    setPaneConfig(isMobile ? MOBILE_PANE_CONFIG : DEFAULT_PANE_CONFIG);
  };

  const togglePane = useCallback(
    (pane: keyof DemoPaneConfig): void => {
      setPaneConfig((prev) => ({
        ...prev,
        [pane]: { ...prev[pane], visible: !prev[pane].visible },
      }));
    },
    [setPaneConfig],
  );

  const categories = getAllCategories();
  const componentsInCategory = getComponentsByCategory(activeCategory);
  const totalComponents = getTotalComponentCount();

  // Keyboard shortcuts handler
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key.toUpperCase()) {
        case 'L':
          e.preventDefault();
          togglePane('left');
          break;
        case 'R':
          e.preventDefault();
          togglePane('right');
          break;
        case 'T':
          e.preventDefault();
          cycleTheme();
          break;
        case 'ESCAPE':
          e.preventDefault();
          setSelectedComponent(null);
          break;
      }
    },
    [cycleTheme, togglePane],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return (): void => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

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
          size={paneConfig.top.size}
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
            size={paneConfig.bottom.size}
            minSize={4}
            maxSize={20}
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
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: isMobile ? '8px 12px' : '8px 16px',
                gap: '12px',
                background: 'var(--ui-color-bg)',
                fontSize: '12px',
              }}
            >
              {/* Left: Version & Environment */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Text tone="muted" style={{ fontSize: '12px' }}>
                  <strong>v{UI_VERSION}</strong>
                </Text>
                <Text
                  tone="muted"
                  style={{
                    fontSize: '10px',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    background:
                      ENV === 'development' ? 'var(--ui-color-warning)' : 'var(--ui-color-success)',
                    color: 'var(--ui-color-text-inverse)',
                    textTransform: 'uppercase',
                    fontWeight: 600,
                  }}
                >
                  {ENV === 'development' ? 'DEV' : 'PROD'}
                </Text>
                {!isMobile && (
                  <Text tone="muted" style={{ fontSize: '12px' }}>
                    {totalComponents} components
                  </Text>
                )}
              </div>

              {/* Center: Keyboard Shortcuts (desktop only) */}
              {!isMobile && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  {KEYBOARD_SHORTCUTS.map((shortcut) => (
                    <Text key={shortcut.key} tone="muted" style={{ fontSize: '11px' }}>
                      <kbd
                        style={{
                          padding: '2px 5px',
                          borderRadius: '3px',
                          border: '1px solid var(--ui-color-border)',
                          background: 'var(--ui-color-surface)',
                          fontFamily: 'monospace',
                          fontSize: '10px',
                        }}
                      >
                        {shortcut.key}
                      </kbd>{' '}
                      {shortcut.description}
                    </Text>
                  ))}
                </div>
              )}

              {/* Right: Theme Toggle */}
              <Button
                variant="secondary"
                size="small"
                onClick={cycleTheme}
                title={`Theme: ${getThemeLabel()} (click to change)`}
                aria-label={`Theme: ${getThemeLabel()}, click to change`}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 8px' }}
              >
                <span>{getThemeIcon()}</span>
                {!isMobile && <span style={{ fontSize: '12px' }}>{getThemeLabel()}</span>}
              </Button>
            </div>
          </ResizablePanel>

          {/* Middle Area */}
          <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
            <ResizablePanelGroup direction="horizontal" style={{ flex: 1, minWidth: 0 }}>
              {/* Category Sidebar - Fixed Width */}
              <div
                style={{
                  width: isMobile ? '42px' : '50px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  padding: isMobile ? '4px' : '8px',
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
                  <Button
                    variant="secondary"
                    onClick={resetLayout}
                    title="Reset layout"
                    aria-label="Reset layout"
                    style={{ width: '100%', height: '36px', padding: 0, marginTop: '4px' }}
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
                          className="demo-menu-item"
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '4px',
                            padding: '12px',
                            textAlign: 'left',
                            width: '100%',
                            background:
                              selectedComponent?.id === comp.id
                                ? 'var(--ui-color-surface-hover, rgba(0,0,0,0.08))'
                                : 'transparent',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            transition: 'background 0.15s ease',
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
                  size={paneConfig.right.size}
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
                            gridTemplateColumns: isMobile
                              ? '1fr'
                              : 'repeat(auto-fit, minmax(320px, 1fr))',
                            gap: isMobile ? '16px' : '24px',
                            padding: isMobile ? '16px' : '24px',
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
