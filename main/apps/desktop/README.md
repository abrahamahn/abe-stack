# BSLT Desktop

> Your web app, but native.

Electron wrapper that brings the BSLT web application to desktop. Shares 90% of code with `apps/web` - same React components, same UI kit, same business logic. The remaining 10% handles native features like file dialogs, system notifications, and OS integration.

## Features

- single codebase with web app 🔄
- native file dialogs (open/save) 📂
- system notifications 🔔
- type-safe IPC bridge 🔒
- sandboxed for security 🛡️
- cross-platform (Windows, macOS, Linux) 💻
- external URL handling 🌐
- smart port detection in dev mode 🔌
- hot module replacement ⚡

## Getting Started

```sh
# from monorepo root - recommended
pnpm dev

# standalone (runs its own Vite server)
pnpm --filter @bslt/desktop dev:standalone

# just electron (if Vite already running)
pnpm --filter @bslt/desktop dev
```

**Port Configuration**

Development mode auto-detects available ports. Priority order:

1. `DESKTOP_RENDERER_PORT` environment variable
2. `VITE_PORT` environment variable
3. Falls back to 5174 → 5173 → 5175

```sh
# Use specific port
DESKTOP_RENDERER_PORT=3000 pnpm --filter @bslt/desktop dev:standalone
```

## Commands

- `pnpm --filter @bslt/desktop build` - build renderer (Vite) + main process (esbuild)
- `pnpm --filter @bslt/desktop package` - create distributable (.exe, .dmg, .AppImage)
- `pnpm --filter @bslt/desktop test` - run tests
- `pnpm --filter @bslt/desktop test:watch` - run tests in watch mode
- `pnpm --filter @bslt/desktop type-check` - check types

## Architecture

Electron runs two processes:

```
┌─────────────────────────────────────┐
│  MAIN PROCESS (Node.js)             │
│  src/electron/main.ts               │
│  - creates windows                  │
│  - handles IPC                      │
│  - full OS access                   │
└──────────────┬──────────────────────┘
               │ IPC
┌──────────────▼──────────────────────┐
│  PRELOAD (contextBridge)            │
│  src/electron/preload.ts            │
│  - exposes window.electronAPI       │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│  RENDERER (Chromium + React)        │
│  src/main.tsx                       │
│  - your React app                   │
│  - sandboxed, no Node access        │
└─────────────────────────────────────┘
```

## Project Structure

```
apps/desktop/
├── src/
│   ├── electron/            # main process (Node.js)
│   │   ├── main.ts          # entry, creates BrowserWindow, registers handlers
│   │   ├── preload.ts       # contextBridge, exposes window.electronAPI
│   │   ├── ipc/
│   │   │   ├── handlers.ts  # IPC handler implementations
│   │   │   └── index.ts     # exports registerIPCHandlers
│   │   ├── types/
│   │   │   ├── ipc.ts       # IPCChannelMap, type-safe channel definitions
│   │   │   └── index.ts
│   │   ├── utils/
│   │   │   └── index.ts     # re-exports port utils from @bslt/shared
│   │   └── __tests__/       # main process tests
│   ├── main.tsx             # renderer entry (React app)
│   ├── types.d.ts           # window.electronAPI type declarations
│   └── __tests__/           # renderer tests
├── index.html               # HTML template
├── tsconfig.json            # renderer TypeScript config
├── tsconfig.electron.json   # main process TypeScript config
├── vitest.config.ts         # test configuration
└── dist/                    # build output
    ├── electron/            # compiled main process (esbuild)
    └── renderer/            # bundled React app (Vite)
```

## Adding Native Features

To add a new IPC-based feature:

1. **Define the contract** in `shared/core/src/contracts/native.ts`:

   ```typescript
   export interface NativeBridge {
     // ... existing methods
     yourMethod: (arg: string) => Promise<Result>;
   }
   ```

2. **Add IPC channel type** in `src/electron/types/ipc.ts`:

   ```typescript
   export type IPCChannelMap = {
     // ... existing channels
     'your-channel': { args: [string]; result: Result };
   };
   ```

3. **Implement handler** in `src/electron/ipc/handlers.ts`:

   ```typescript
   ipcMain.handle('your-channel', async (_event, arg: string) => {
     // implementation
     return result;
   });
   ```

4. **Expose in preload** at `src/electron/preload.ts`:

   ```typescript
   const electronBridge: NativeBridge = {
     // ... existing methods
     yourMethod: (arg) => invoke('your-channel', arg),
   };
   ```

5. **Use in renderer** via `window.electronAPI`:
   ```typescript
   const result = await window.electronAPI?.yourMethod('test');
   ```

**Current IPC Channels:**

- `get-app-version` - Returns app version string
- `show-open-dialog` - Opens native file picker (single/multiple files)
- `show-save-dialog` - Opens native save file dialog
- `show-notification` - Displays system notification (one-way, no response)

## Security

We follow Electron security best practices:

- `nodeIntegration: false` - renderer can't access Node.js directly
- `contextIsolation: true` - preload context separated from renderer
- `sandbox: true` - OS-level process isolation
- **minimal API surface** - only expose what's needed via `contextBridge`
- **type-safe IPC** - compile-time guarantees via `IPCChannelMap`
- **no wildcard handlers** - explicit channel registration only

All renderer ↔ main communication goes through the type-safe IPC bridge. No Node.js APIs are exposed to the renderer.

## Build & Package

**Development builds:**

- Renderer: Vite dev server with HMR
- Main process: esbuild (watch mode in dev:standalone)

**Production builds:**

- Renderer: Vite bundle → `dist/renderer/`
- Main process: esbuild bundle → `dist/electron/`
- Packager: electron-builder (configured in `package.json`)

**Package outputs:**

- Windows: NSIS installer (`.exe`)
- macOS: DMG disk image (`.dmg`)
- Linux: AppImage (`.AppImage`)

All packages output to `apps/desktop/release/`.

## Platform-Specific Behavior

**macOS:**

- App stays open when all windows closed (standard macOS UX)
- Clicking dock icon recreates window if closed

**Windows/Linux:**

- App quits when last window closes

**Linux/WSL:**

- Hardware acceleration disabled by default (prevents crashes)
- Flag: `--disable-features=SystemdIntegration` prevents systemd warnings

## Testing

Full test coverage with Vitest:

- Main process tests: `src/electron/__tests__/main.test.ts`
- IPC handlers: `src/electron/ipc/__tests__/handlers.test.ts`
- Preload bridge: `src/electron/__tests__/preload.test.ts`
- Integration tests: `src/__tests__/integration.test.ts`

Tests use mocked Electron APIs and verify IPC type safety.

## Troubleshooting

**Blank window?**

- Check if Vite dev server is running on expected port
- Check console for port conflicts
- Verify `DESKTOP_RENDERER_PORT` environment variable

**IPC returns undefined?**

- Verify handler is registered in `src/electron/ipc/handlers.ts`
- Check channel names match in `IPCChannelMap`
- Confirm preload script is loaded (check BrowserWindow config)

**Port already in use?**

- App will auto-detect next available port (5174 → 5173 → 5175)
- Override with `DESKTOP_RENDERER_PORT=<port>`

**Linux crashes on startup?**

- Hardware acceleration is disabled in `main.ts`
- Check for missing deps: `libgtk-3-0`, `libnss3`, `libgbm1`

**Type errors on `window.electronAPI`?**

- Ensure `src/types.d.ts` is included in your tsconfig
- Check that `@bslt/shared` types are accessible

---

[Read the detailed docs](../../docs) for architecture decisions, development workflows, and contribution guidelines.
