// apps/desktop/src/App.tsx
// Import shared UI components from the shared package
// import { Button, Card, Spinner } from '@abe-stack/ui';

import type { ReactElement } from 'react';

declare global {
  interface Window {
    electronAPI?: unknown;
  }
}

/**
 * Desktop Application Entry Point (Electron/Tauri)
 *
 * This is the desktop-specific entry that uses the SAME shared UI components
 * from @abe-stack/ui package as the web app.
 *
 * Platform-specific features (desktop-only) can be added here:
 * - File system access
 * - System notifications
 * - System tray
 * - Native menus
 * - Auto-updates
 */
function App(): ReactElement {
  // Example: Desktop-specific feature detection
  const isElectron =
    typeof window !== 'undefined' && 'electronAPI' in window && Boolean(window.electronAPI);

  return (
    <div style={{ padding: '20px' }}>
      <h1>Abe Stack Desktop App</h1>
      <p>Welcome to the desktop application!</p>

      {isElectron && (
        <div
          style={{ padding: '10px', background: '#e3f2fd', borderRadius: '4px', marginTop: '10px' }}
        >
          <strong>Running in Electron</strong>
          <p>Access to native desktop features available!</p>
        </div>
      )}

      {/* Example: Using shared components (same as web) */}
      {/* <Button>Click Me</Button> */}
      {/* <Card>Shared Card Component</Card> */}

      <div
        style={{ marginTop: '20px', padding: '15px', background: '#f0f0f0', borderRadius: '8px' }}
      >
        <h3>Architecture</h3>
        <ul>
          <li>
            ✅ Shared UI from <code>@abe-stack/ui</code>
          </li>
          <li>
            ✅ Shared logic from <code>@abe-stack/shared</code>
          </li>
          <li>
            ✅ Desktop-specific features in <code>apps/desktop/src/native/</code>
          </li>
          <li>✅ 80-90% code sharing with web app</li>
        </ul>
      </div>
    </div>
  );
}

export default App;
