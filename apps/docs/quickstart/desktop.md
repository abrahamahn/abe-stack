# Quickstart: Desktop App

Electron wrapper around the web app. Same React code, plus native features (file dialogs, system notifications, OS integration).

---

## Prerequisites

- Monorepo installed (`pnpm install` from root)
- No additional dependencies -- Electron installs with the monorepo

---

## Start

### Option A: With full stack (recommended)

```bash
# From monorepo root -- starts web, server, AND desktop
pnpm dev
```

### Option B: Standalone (runs its own Vite server)

```bash
pnpm --filter @abe-stack/desktop dev:standalone
```

### Option C: Electron only (if Vite is already running)

```bash
pnpm --filter @abe-stack/desktop dev
```

The desktop app loads the web frontend in an Electron window. In dev mode, it connects to the Vite dev server for HMR.

---

## Port Detection

Dev mode auto-detects the Vite server port:

1. `DESKTOP_RENDERER_PORT` env var (if set)
2. `VITE_PORT` env var (if set)
3. Falls back: 5174 -> 5173 -> 5175

Override manually:

```bash
DESKTOP_RENDERER_PORT=3000 pnpm --filter @abe-stack/desktop dev:standalone
```

---

## Commands

```bash
pnpm --filter @abe-stack/desktop dev              # Electron + Vite (concurrent)
pnpm --filter @abe-stack/desktop dev:standalone    # Full standalone build
pnpm --filter @abe-stack/desktop build             # Production build
pnpm --filter @abe-stack/desktop package           # Create installer (.exe/.dmg/.AppImage)
pnpm --filter @abe-stack/desktop test              # Run tests
pnpm --filter @abe-stack/desktop type-check        # TypeScript checking
```

---

## Architecture

Electron runs two processes connected by a type-safe IPC bridge:

```
Main Process (Node.js)          Renderer (Chromium + React)
  src/electron/main.ts            src/main.tsx
  - creates windows               - your React app
  - handles IPC                   - sandboxed, no Node access
  - full OS access                - uses window.electronAPI
         |                                 ^
         +--- preload.ts (contextBridge) --+
```

### IPC Channels

| Channel             | Direction      | Purpose                               |
| ------------------- | -------------- | ------------------------------------- |
| `get-app-version`   | renderer->main | Returns app version string            |
| `show-open-dialog`  | renderer->main | Native file picker                    |
| `show-save-dialog`  | renderer->main | Native save dialog                    |
| `show-notification` | renderer->main | System notification (fire-and-forget) |

### Adding a New Native Feature

1. Define contract in `shared/core/src/contracts/native.ts`
2. Add channel type in `src/electron/types/ipc.ts`
3. Implement handler in `src/electron/ipc/handlers.ts`
4. Expose in `src/electron/preload.ts`
5. Use via `window.electronAPI?.yourMethod()`

---

## Project Structure

```
apps/desktop/
├── src/
│   ├── electron/           # Main process (Node.js)
│   │   ├── main.ts         # Entry, creates BrowserWindow
│   │   ├── preload.ts      # contextBridge (IPC bridge)
│   │   ├── ipc/            # IPC handler implementations
│   │   └── types/          # Type-safe channel definitions
│   ├── main.tsx            # Renderer entry (React app)
│   └── types.d.ts          # window.electronAPI declarations
├── index.html              # HTML template
└── dist/                   # Build output
    ├── electron/           # Compiled main process
    └── renderer/           # Bundled React app
```

---

## Building for Distribution

```bash
# Build both renderer and main process
pnpm --filter @abe-stack/desktop build

# Create platform installer
pnpm --filter @abe-stack/desktop package
```

Output in `apps/desktop/release/`:

| Platform | Format      |
| -------- | ----------- |
| Windows  | `.exe`      |
| macOS    | `.dmg`      |
| Linux    | `.AppImage` |

---

## Security

The desktop app follows Electron security best practices:

- `nodeIntegration: false` -- renderer cannot access Node.js
- `contextIsolation: true` -- preload context is separated
- `sandbox: true` -- OS-level process isolation
- Minimal API surface via `contextBridge`
- Type-safe IPC with compile-time channel validation

---

## Platform Notes

**macOS:** App stays open when all windows are closed (standard behavior). Dock click recreates the window.

**Windows/Linux:** App quits when the last window closes.

**Linux/WSL:** Hardware acceleration is disabled by default to prevent crashes. If you see systemd warnings, the `--disable-features=SystemdIntegration` flag is already applied.

---

## Troubleshooting

**Blank window:** Check if Vite dev server is running on the expected port. Try `DESKTOP_RENDERER_PORT=5173`.

**Port conflict:** The app auto-falls back through ports 5174, 5173, 5175. Override with `DESKTOP_RENDERER_PORT`.

**Linux missing libraries:** Install `libgtk-3-0`, `libnss3`, `libgbm1`.

**`window.electronAPI` is undefined:** Ensure `src/types.d.ts` is in your tsconfig and the preload script loaded correctly.

---

## Next Steps

- Read the full [Desktop README](../../apps/desktop/README.md) for IPC details
- See [Adding Native Features](#adding-a-new-native-feature) to extend the IPC bridge
- See [Web Quickstart](./web.md) for frontend development (shared code)
