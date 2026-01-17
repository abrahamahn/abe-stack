# Abe Stack Desktop App

Electron wrapper for the ABE Stack web application.

## Architecture

The desktop app is a thin Electron wrapper that loads the web application:

- **Development**: Loads from `http://localhost:5173` (web dev server)
- **Production**: Loads bundled web app from `dist/renderer/`

This approach means:

- No code duplication between web and desktop
- Full feature parity with the web app
- Desktop-specific features can be added via Electron APIs

## Development

```bash
# Run with web dev server (recommended - run from monorepo root)
pnpm dev:start

# Run desktop standalone (starts its own renderer)
pnpm --filter @abe-stack/desktop dev:standalone

# Run just the electron shell (requires web server already running)
pnpm --filter @abe-stack/desktop dev
```

## Production Build

```bash
# Build the desktop app (includes web bundle)
pnpm --filter @abe-stack/desktop build

# Package for distribution
pnpm --filter @abe-stack/desktop package
```

## Project Structure

```
desktop/
├── electron/           # Electron main process
│   ├── main.ts        # Main process entry, creates BrowserWindow
│   ├── preload.ts     # Preload script for IPC
│   └── tsconfig.json  # Electron-specific TS config
├── src/               # Minimal renderer bootstrap
│   └── main.tsx       # Entry point (loads web app or dev server)
├── public/            # Static assets
└── dist/              # Build output
    ├── electron/      # Compiled main process
    └── renderer/      # Bundled web app (production)
```

## Packaging

The app can be built for multiple platforms:

- **Windows**: Creates NSIS installer
- **macOS**: Creates DMG
- **Linux**: Creates AppImage

## Adding Desktop-Specific Features

1. Add IPC handlers in `electron/main.ts`
2. Expose APIs via `electron/preload.ts`
3. Use from renderer via `window.electronAPI`

Examples:

- Native file dialogs
- System notifications
- Menu bar integration
- Auto-updates

---

_Last Updated: 2026-01-17_
