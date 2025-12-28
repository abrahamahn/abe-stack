# Desktop-Specific Features

This directory contains Electron/Tauri-specific features that are NOT shared with the web app.

## What Goes Here

- **File System Operations**: Reading/writing local files
- **System Tray**: Tray icon and menus
- **Native Notifications**: System notifications
- **Auto Updates**: Electron auto-updater integration
- **Native Menus**: Application menus
- **IPC Communication**: Communication with Electron main process
- **Native Dialogs**: File open/save dialogs

## Example Structure

```
native/
├── hooks/
│   ├── useFileSystem.ts      # File system access hooks
│   ├── useNotifications.ts   # Native notification hooks
│   └── useSystemTray.ts      # System tray hooks
├── services/
│   ├── fileService.ts        # File operations
│   └── updaterService.ts     # Auto-update service
└── types/
    └── electron.d.ts         # Electron type definitions
```

## Usage

```typescript
// In desktop App.tsx
import { useFileSystem } from './native/hooks/useFileSystem';

function DesktopFeature() {
  const { openFile, saveFile } = useFileSystem();

  return (
    <Button onClick={openFile}>
      Open File (Desktop Only)
    </Button>
  );
}
```

## Important

- These features will NOT work in the web app
- Always check if running in Electron before using:
  ```typescript
  if (window.electronAPI) {
    // Use desktop features
  }
  ```
