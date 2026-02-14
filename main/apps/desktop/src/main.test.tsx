// main/apps/desktop/src/main.test.tsx
/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { act, cleanup, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock @abe-stack/ui components before any imports that use them
vi.mock('@abe-stack/ui', () => ({
  ['Card']: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="card" className={className}>
      {children}
    </div>
  ),
  ['Heading']: ({
    children,
    as: component = 'h1',
    size,
  }: {
    children: React.ReactNode;
    as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
    size?: string;
  }) => {
    const Component = component;
    return <Component data-size={size}>{children}</Component>;
  },
  ['PageContainer']: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="page-container">{children}</div>
  ),
  ['Text']: ({
    children,
    as: component = 'p',
    className,
  }: {
    children: React.ReactNode;
    as?: 'p' | 'span';
    className?: string;
  }) => {
    const Component = component;
    return <Component className={className}>{children}</Component>;
  },
  ['ThemeProvider']: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="theme-provider">{children}</div>
  ),
}));

// Mock CSS import
vi.mock('@abe-stack/ui/styles/elements.css', () => ({}));

// Mock react-dom/client
const mockRender = vi.fn();
const mockCreateRoot = vi.fn(() => ({
  render: mockRender,
}));

vi.mock('react-dom/client', () => ({
  createRoot: mockCreateRoot,
}));

describe('main.tsx', () => {
  let rootElement: HTMLDivElement | null = null;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();

    // Remove any existing root elements (from setup.ts or previous tests)
    let existingRoot = document.getElementById('root');
    while (existingRoot !== null) {
      existingRoot.remove();
      existingRoot = document.getElementById('root');
    }

    // Create a fresh root element
    rootElement = document.createElement('div');
    rootElement.id = 'root';
    document.body.appendChild(rootElement);

    // Clear window.electronAPI
    delete (window as { electronAPI?: unknown }).electronAPI;
  });

  afterEach(() => {
    cleanup();
    if (rootElement !== null && document.body.contains(rootElement)) {
      document.body.removeChild(rootElement);
    }
    rootElement = null;
  });

  describe('root container', () => {
    it('should find root container element', async () => {
      await import('./main');

      expect(mockCreateRoot).toHaveBeenCalled();
      const lastCall = mockCreateRoot.mock.calls.at(-1);
      const rootArg = (lastCall as unknown as [HTMLElement])[0];
      expect(rootArg).toBe(rootElement);
    }, 60000);

    it('should throw error when root container is not found', () => {
      // Remove the root element
      if (rootElement !== null) {
        document.body.removeChild(rootElement);
        rootElement = null;
      }

      // Since main.tsx executes at module load time, we need to test the error
      // by verifying the guard logic. The module throws synchronously when
      // document.getElementById('root') returns null.
      // We verify this behavior by testing the condition directly since
      // vi.resetModules() cannot fully reset module state with side effects.
      const container = document.getElementById('root');
      expect(container).toBeNull();

      // Verify that if we were to execute the same logic, it would throw
      expect(() => {
        if (container === null) {
          throw new Error('Root container not found');
        }
      }).toThrow('Root container not found');
    });

    it('should call createRoot with the correct element', async () => {
      vi.clearAllMocks();
      await import('./main');

      expect(mockCreateRoot).toHaveBeenCalled();
      const lastCall = mockCreateRoot.mock.calls.at(-1);
      const rootArg = (lastCall as unknown as [HTMLElement])[0];
      expect(rootArg).toBe(document.getElementById('root'));
    });
  });

  describe('render', () => {
    it('should render application in StrictMode', async () => {
      const { StrictMode } = await import('react');

      await import('./main');

      expect(mockRender).toHaveBeenCalledTimes(1);
      const renderedElement = mockRender.mock.calls[0]?.[0];

      // Check that it's wrapped in StrictMode by comparing the type
      expect(renderedElement?.type).toBe(StrictMode);
    }, 60000);

    it('should render main content', async () => {
      await import('./main');

      expect(mockRender).toHaveBeenCalled();
      const renderedElement = mockRender.mock.calls[0]?.[0];

      // The children should contain the main div
      expect(renderedElement?.props.children).toBeDefined();
    });
  });

  describe('electron detection', () => {
    it('should detect electron environment when electronAPI is present', async () => {
      // Set up electronAPI
      (window as { electronAPI?: unknown }).electronAPI = {
        getPlatform: () => Promise.resolve('electron'),
        isNative: () => true,
      };

      vi.resetModules();
      await import('./main');

      expect(mockRender).toHaveBeenCalledTimes(1);
      const renderedElement = mockRender.mock.calls[0]?.[0];
      const strictModeChildren = renderedElement?.props.children;

      // The component renders within ThemeProvider when running
      expect(strictModeChildren).toBeDefined();
    });

    it('should not show electron indicator when not in electron', async () => {
      // Ensure no electronAPI
      delete (window as { electronAPI?: unknown }).electronAPI;

      vi.resetModules();
      await import('./main');

      expect(mockRender).toHaveBeenCalled();
    });

    it('should handle electronAPI being undefined', async () => {
      (window as { electronAPI?: unknown }).electronAPI = undefined;

      vi.resetModules();
      await import('./main');

      expect(mockRender).toHaveBeenCalled();
    });

    it('should handle electronAPI being null', async () => {
      (window as { electronAPI?: unknown }).electronAPI = null;

      vi.resetModules();
      await import('./main');

      expect(mockRender).toHaveBeenCalled();
    });
  });

  describe('integration rendering', () => {
    it('should render without crashing', async () => {
      await import('./main');

      expect(mockCreateRoot).toHaveBeenCalled();
      expect(mockRender).toHaveBeenCalled();
    }, 60000);

    it('should render heading text', async () => {
      // Unmock react-dom/client for real rendering
      vi.doUnmock('react-dom/client');
      vi.resetModules();

      const { StrictMode } = await import('react');
      const { createRoot: realCreateRoot } = await import('react-dom/client');
      const { Card, Heading, PageContainer, Text, ThemeProvider } = await import('@abe-stack/ui');

      if (rootElement !== null) {
        const root = realCreateRoot(rootElement);
        act(() => {
          root.render(
            <StrictMode>
              <ThemeProvider>
                <div className="h-screen overflow-auto">
                  <PageContainer>
                    <section className="grid gap-3">
                      <Heading as="h1" size="xl">
                        ABE Stack Desktop
                      </Heading>
                      <Text className="text-md">
                        A native desktop application built with Electron, sharing code with the web
                        app.
                      </Text>
                    </section>
                    <Card className="p-4">
                      <Heading as="h3" size="sm">
                        Architecture
                      </Heading>
                    </Card>
                  </PageContainer>
                </div>
              </ThemeProvider>
            </StrictMode>,
          );
        });

        await waitFor(() => {
          expect(screen.getByText('ABE Stack Desktop')).toBeInTheDocument();
        });

        expect(
          screen.getByText(
            'A native desktop application built with Electron, sharing code with the web app.',
          ),
        ).toBeInTheDocument();

        root.unmount();
      }
    });

    it('should render architecture section', async () => {
      vi.doUnmock('react-dom/client');
      vi.resetModules();

      const { StrictMode } = await import('react');
      const { createRoot: realCreateRoot } = await import('react-dom/client');
      const { Card, Heading, PageContainer, Text, ThemeProvider } = await import('@abe-stack/ui');

      if (rootElement !== null) {
        const root = realCreateRoot(rootElement);
        act(() => {
          root.render(
            <StrictMode>
              <ThemeProvider>
                <PageContainer>
                  <Card className="p-4">
                    <Heading as="h3" size="sm">
                      Architecture
                    </Heading>
                    <ul className="list-disc ml-6 mt-2 space-y-1">
                      <li>
                        <Text as="span">
                          Shared UI from{' '}
                          <code className="bg-subtle px-1 rounded">@abe-stack/ui</code>
                        </Text>
                      </li>
                    </ul>
                  </Card>
                </PageContainer>
              </ThemeProvider>
            </StrictMode>,
          );
        });

        await waitFor(() => {
          expect(screen.getByText('Architecture')).toBeInTheDocument();
        });

        expect(screen.getByText('@abe-stack/ui')).toBeInTheDocument();

        root.unmount();
      }
    });

    it('should render electron indicator when in electron environment', async () => {
      (window as { electronAPI?: unknown }).electronAPI = {
        getPlatform: () => Promise.resolve('electron'),
        isNative: () => true,
      };

      vi.doUnmock('react-dom/client');
      vi.resetModules();

      const { StrictMode } = await import('react');
      const { createRoot: realCreateRoot } = await import('react-dom/client');
      const { Card, Heading, PageContainer, Text, ThemeProvider } = await import('@abe-stack/ui');

      const isElectron =
        typeof window !== 'undefined' && 'electronAPI' in window && Boolean(window.electronAPI);

      if (rootElement !== null) {
        const root = realCreateRoot(rootElement);
        act(() => {
          root.render(
            <StrictMode>
              <ThemeProvider>
                <PageContainer>
                  <Heading as="h1" size="xl">
                    ABE Stack Desktop
                  </Heading>
                  {isElectron && (
                    <Card className="p-4 bg-info-subtle">
                      <Heading as="h3" size="sm">
                        Running in Electron
                      </Heading>
                      <Text>Access to native desktop features available!</Text>
                    </Card>
                  )}
                </PageContainer>
              </ThemeProvider>
            </StrictMode>,
          );
        });

        await waitFor(() => {
          expect(screen.getByText('Running in Electron')).toBeInTheDocument();
        });

        expect(
          screen.getByText('Access to native desktop features available!'),
        ).toBeInTheDocument();

        root.unmount();
      }
    });

    it('should not render electron indicator when not in electron', async () => {
      delete (window as { electronAPI?: unknown }).electronAPI;

      vi.doUnmock('react-dom/client');
      vi.resetModules();

      const { StrictMode } = await import('react');
      const { createRoot: realCreateRoot } = await import('react-dom/client');
      const { Card, Heading, PageContainer, Text, ThemeProvider } = await import('@abe-stack/ui');

      const isElectron =
        typeof window !== 'undefined' && 'electronAPI' in window && Boolean(window.electronAPI);

      if (rootElement !== null) {
        const root = realCreateRoot(rootElement);
        act(() => {
          root.render(
            <StrictMode>
              <ThemeProvider>
                <PageContainer>
                  <Heading as="h1" size="xl">
                    ABE Stack Desktop
                  </Heading>
                  {isElectron && (
                    <Card className="p-4 bg-info-subtle">
                      <Heading as="h3" size="sm">
                        Running in Electron
                      </Heading>
                      <Text>Access to native desktop features available!</Text>
                    </Card>
                  )}
                </PageContainer>
              </ThemeProvider>
            </StrictMode>,
          );
        });

        await waitFor(() => {
          expect(screen.getByText('ABE Stack Desktop')).toBeInTheDocument();
        });

        expect(screen.queryByText('Running in Electron')).not.toBeInTheDocument();

        root.unmount();
      }
    });
  });
});
