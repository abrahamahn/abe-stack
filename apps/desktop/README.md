# Abe Stack Desktop App

Electron wrapper for the ABE Stack web application.

## Architecture

The desktop app is a thin Electron wrapper that loads the web application:

- **Development**: Loads from dev server (tries ports 5174, 5173, 5175 in order)
- **Production**: Loads bundled web app from `dist/renderer/`

This approach means:

- No code duplication between web and desktop
- Full feature parity with the web app
- Desktop-specific features can be added via Electron APIs

## Development

```bash
# Run from monorepo root (starts web + server + all apps)
pnpm dev

# Run desktop standalone (starts its own Vite renderer on port 5174)
pnpm --filter @abe-stack/desktop dev:standalone

# Run just the electron shell (requires Vite dev server already running)
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
├── src/
│   ├── electron/           # Electron main process
│   │   ├── main.ts         # Main process entry, creates BrowserWindow
│   │   ├── preload.ts      # Preload script for IPC
│   │   ├── tsconfig.json   # Node/CommonJS config for electron
│   │   └── __tests__/      # Electron tests
│   ├── main.tsx            # Renderer entry point (React root)
│   └── types.d.ts          # Type declarations (electronAPI)
├── index.html              # HTML entry point
├── tsconfig.json           # React/Vite config for renderer
└── dist/                   # Build output
    ├── electron/           # Compiled main process (CommonJS)
    └── renderer/           # Bundled web app (ESM)
```

## TypeScript Configuration

The desktop app uses two separate TypeScript configs due to different runtime environments:

### Renderer (`tsconfig.json`)

For React code running in Chromium (browser-like environment):

- Extends `tsconfig.react.json` base config
- Uses Vite for bundling (ESM)
- Path alias `@/*` maps to `./src/*`
- Excludes `src/electron/` (handled separately)
- References `@abe-stack/core` and `@abe-stack/ui` packages

### Electron Main (`src/electron/tsconfig.json`)

For Node.js code running in Electron's main process:

- Extends `tsconfig.node.json` base config
- Outputs CommonJS to `dist/electron/`
- Uses Node module resolution
- Only includes `*.ts` files in the electron directory

## Packaging

The app can be built for multiple platforms:

- **Windows**: Creates NSIS installer
- **macOS**: Creates DMG
- **Linux**: Creates AppImage

## Adding Desktop-Specific Features

1. Add IPC handlers in `src/electron/main.ts`
2. Expose APIs via `src/electron/preload.ts`
3. Use from renderer via `window.electronAPI`

Examples:

- Native file dialogs
- System notifications
- Menu bar integration
- Auto-updates

---

_Last Updated: 2026-01-18_
