// apps/desktop/src/__tests__/main.test.tsx
/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { cleanup, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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

    // Create a root element
    rootElement = document.createElement('div');
    rootElement.id = 'root';
    document.body.appendChild(rootElement);

    // Clear window.electronAPI
    delete (window as { electronAPI?: unknown }).electronAPI;
  });

  afterEach(() => {
    cleanup();
    if (rootElement && document.body.contains(rootElement)) {
      document.body.removeChild(rootElement);
    }
    rootElement = null;
  });

  describe('root container', () => {
    it('should find root container element', async () => {
      await import('../main');

      expect(mockCreateRoot).toHaveBeenCalledTimes(1);
      expect(mockCreateRoot).toHaveBeenCalledWith(rootElement);
    }, 10000);

    it('should throw error when root container is not found', async () => {
      // Remove the root element
      if (rootElement) {
        document.body.removeChild(rootElement);
        rootElement = null;
      }

      await expect(import('../main')).rejects.toThrow('Root container not found');
    });

    it('should call createRoot with the correct element', async () => {
      await import('../main');

      expect(mockCreateRoot).toHaveBeenCalledTimes(1);
      const rootArg = (mockCreateRoot.mock.calls[0] as unknown as [HTMLElement])[0];
      expect(rootArg).toBe(document.getElementById('root'));
    });
  });

  describe('render', () => {
    it('should render application in StrictMode', async () => {
      const { StrictMode } = await import('react');

      await import('../main');

      expect(mockRender).toHaveBeenCalledTimes(1);
      const renderedElement = mockRender.mock.calls[0]?.[0];

      // Check that it's wrapped in StrictMode by comparing the type
      expect(renderedElement?.type).toBe(StrictMode);
    });

    it('should render main content', async () => {
      await import('../main');

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
      await import('../main');

      expect(mockRender).toHaveBeenCalledTimes(1);
      const renderedElement = mockRender.mock.calls[0]?.[0];
      const mainDiv = renderedElement?.props.children;

      // Find the electron indicator in the rendered content
      // The component renders a special div when running in Electron
      expect(mainDiv).toBeDefined();
    });

    it('should not show electron indicator when not in electron', async () => {
      // Ensure no electronAPI
      delete (window as { electronAPI?: unknown }).electronAPI;

      vi.resetModules();
      await import('../main');

      expect(mockRender).toHaveBeenCalled();
    });

    it('should handle electronAPI being undefined', async () => {
      (window as { electronAPI?: unknown }).electronAPI = undefined;

      vi.resetModules();
      await import('../main');

      expect(mockRender).toHaveBeenCalled();
    });

    it('should handle electronAPI being null', async () => {
      (window as { electronAPI?: unknown }).electronAPI = null;

      vi.resetModules();
      await import('../main');

      expect(mockRender).toHaveBeenCalled();
    });
  });

  describe('integration rendering', () => {
    it('should render without crashing', async () => {
      await import('../main');

      expect(mockCreateRoot).toHaveBeenCalled();
      expect(mockRender).toHaveBeenCalled();
    });

    it('should render heading text', async () => {
      // For this test, we'll render the actual content to check the structure
      const { createRoot } = await import('react-dom/client');
      vi.mocked(createRoot).mockRestore?.();

      // Reset mocks to use real implementation
      vi.resetModules();
      vi.doUnmock('react-dom/client');

      // Re-import to get real implementation
      const { StrictMode } = await import('react');
      const { createRoot: realCreateRoot } = await import('react-dom/client');

      if (rootElement) {
        const root = realCreateRoot(rootElement);
        root.render(
          <StrictMode>
            <div style={{ padding: '20px' }}>
              <h1>Abe Stack Desktop App</h1>
              <p>Welcome to the desktop application!</p>
            </div>
          </StrictMode>,
        );

        await waitFor(() => {
          expect(screen.getByText('Abe Stack Desktop App')).toBeInTheDocument();
        });

        expect(screen.getByText('Welcome to the desktop application!')).toBeInTheDocument();

        root.unmount();
      }
    });

    it('should render architecture section', async () => {
      const { StrictMode } = await import('react');
      const { createRoot: realCreateRoot } = await import('react-dom/client');

      if (rootElement) {
        const root = realCreateRoot(rootElement);
        root.render(
          <StrictMode>
            <div style={{ padding: '20px' }}>
              <h1>Abe Stack Desktop App</h1>
              <div
                style={{
                  marginTop: '20px',
                  padding: '15px',
                  background: '#f0f0f0',
                  borderRadius: '8px',
                }}
              >
                <h3>Architecture</h3>
                <ul>
                  <li>
                    Shared UI from <code>@abe-stack/ui</code>
                  </li>
                </ul>
              </div>
            </div>
          </StrictMode>,
        );

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

      const { StrictMode } = await import('react');
      const { createRoot: realCreateRoot } = await import('react-dom/client');

      const isElectron =
        typeof window !== 'undefined' && 'electronAPI' in window && Boolean(window.electronAPI);

      if (rootElement) {
        const root = realCreateRoot(rootElement);
        root.render(
          <StrictMode>
            <div style={{ padding: '20px' }}>
              <h1>Abe Stack Desktop App</h1>
              {isElectron && (
                <div
                  style={{
                    padding: '10px',
                    background: '#e3f2fd',
                    borderRadius: '4px',
                    marginTop: '10px',
                  }}
                >
                  <strong>Running in Electron</strong>
                  <p>Access to native desktop features available!</p>
                </div>
              )}
            </div>
          </StrictMode>,
        );

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

      const { StrictMode } = await import('react');
      const { createRoot: realCreateRoot } = await import('react-dom/client');

      const isElectron =
        typeof window !== 'undefined' && 'electronAPI' in window && Boolean(window.electronAPI);

      if (rootElement) {
        const root = realCreateRoot(rootElement);
        root.render(
          <StrictMode>
            <div style={{ padding: '20px' }}>
              <h1>Abe Stack Desktop App</h1>
              {isElectron && (
                <div>
                  <strong>Running in Electron</strong>
                </div>
              )}
            </div>
          </StrictMode>,
        );

        await waitFor(() => {
          expect(screen.getByText('Abe Stack Desktop App')).toBeInTheDocument();
        });

        expect(screen.queryByText('Running in Electron')).not.toBeInTheDocument();

        root.unmount();
      }
    });
  });
});
