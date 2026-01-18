// apps/desktop/src/main.tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

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

      <div
        style={{ marginTop: '20px', padding: '15px', background: '#f0f0f0', borderRadius: '8px' }}
      >
        <h3>Architecture</h3>
        <ul>
          <li>
            Shared UI from <code>@abe-stack/ui</code>
          </li>
          <li>
            Shared logic from <code>@abe-stack/core</code>
          </li>
          <li>
            Desktop-specific features in <code>apps/desktop/src/electron/</code>
          </li>
          <li>80-90% code sharing with web app</li>
        </ul>
      </div>
    </div>
  </StrictMode>,
);
