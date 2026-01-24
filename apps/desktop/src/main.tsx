// apps/desktop/src/main.tsx
import { Card, Heading, PageContainer, Text, ThemeProvider } from '@abe-stack/ui';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import '@abe-stack/ui/styles/elements.css';

const container = document.getElementById('root');

if (!container) {
  throw new Error('Root container not found');
}

const root = createRoot(container);

/**
 * Desktop Application Entry Point (Electron/Tauri)
 *
 * This is the desktop-specific entry that uses shared UI components
 * from @abe-stack/ui package. Platform-specific features (file system,
 * system tray, native menus, auto-updates) can be added here.
 */
const isElectron =
  typeof window !== 'undefined' && 'electronAPI' in window && Boolean(window.electronAPI);

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
              A native desktop application built with Electron, sharing code with the web app.
            </Text>
          </section>

          {isElectron && (
            <Card className="p-4 bg-info-subtle">
              <Heading as="h3" size="sm">
                Running in Electron
              </Heading>
              <Text>Access to native desktop features available!</Text>
            </Card>
          )}

          <Card className="p-4">
            <Heading as="h3" size="sm">
              Architecture
            </Heading>
            <ul className="list-disc ml-6 mt-2 space-y-1">
              <li>
                <Text as="span">
                  Shared UI from <code className="bg-subtle px-1 rounded">@abe-stack/ui</code>
                </Text>
              </li>
              <li>
                <Text as="span">
                  Shared logic from <code className="bg-subtle px-1 rounded">@abe-stack/core</code>
                </Text>
              </li>
              <li>
                <Text as="span">
                  Desktop-specific features in{' '}
                  <code className="bg-subtle px-1 rounded">apps/desktop/src/electron/</code>
                </Text>
              </li>
              <li>
                <Text as="span">80-90% code sharing with web app</Text>
              </li>
            </ul>
          </Card>

          <Card className="p-4">
            <Heading as="h3" size="sm">
              Features
            </Heading>
            <ul className="list-disc ml-6 mt-2 space-y-1">
              <li>
                <Text as="span">Native file dialogs (open/save)</Text>
              </li>
              <li>
                <Text as="span">System notifications</Text>
              </li>
              <li>
                <Text as="span">Cross-platform (Windows, macOS, Linux)</Text>
              </li>
              <li>
                <Text as="span">Hot module replacement in development</Text>
              </li>
              <li>
                <Text as="span">Secure IPC with context isolation</Text>
              </li>
            </ul>
          </Card>
        </PageContainer>
      </div>
    </ThemeProvider>
  </StrictMode>,
);
