# ABE Stack Desktop App

**An Electron wrapper that brings our web application to the desktop.**

This is the desktop version of ABE Stack. If you have worked with the web app, you will feel right at home here - we share 80-90% of the codebase with `apps/web`. The remaining 10-20% handles desktop-specific concerns like native file dialogs, system notifications, and that satisfying dock icon on macOS.

---

## Table of Contents

- [The Philosophy: Why Electron?](#the-philosophy-why-electron)
- [Understanding Electron Architecture](#understanding-electron-architecture)
- [How Our Desktop App Works](#how-our-desktop-app-works)
- [IPC Communication: Bridging Two Worlds](#ipc-communication-bridging-two-worlds)
- [The NativeBridge Contract](#the-nativebridge-contract)
- [Development Workflow](#development-workflow)
- [Building and Packaging](#building-and-packaging)
- [Project Structure](#project-structure)
- [TypeScript Configuration](#typescript-configuration)
- [Security Considerations](#security-considerations)
- [Platform-Specific Behavior](#platform-specific-behavior)
- [Adding Desktop-Specific Features](#adding-desktop-specific-features)
- [Trade-offs and Design Decisions](#trade-offs-and-design-decisions)
- [Troubleshooting](#troubleshooting)

---

## The Philosophy: Why Electron?

We chose Electron because we wanted to maximize code reuse with our web application. The decision came down to a simple question: how much of our React codebase could we bring to the desktop without rewriting it?

The answer with Electron is "nearly all of it." Our renderer process runs the same React code that powers `apps/web`. We import from `@abe-stack/ui` and `@abe-stack/core` just like the web app does. When we fix a bug in a shared component, both platforms benefit immediately.

We considered alternatives like Tauri (Rust-based, smaller binaries, better performance) and native development (maximum platform fidelity). Each has merits. Tauri would give us smaller binaries and slightly better performance, but at the cost of needing to learn Rust for any native integrations. Native development would give us the best platform experience, but we would need separate codebases for Windows, macOS, and Linux.

Electron is the pragmatic choice when you already have a React application and want desktop distribution with native capabilities. We accept the larger binary size (roughly 150MB compressed) in exchange for development velocity and code sharing.

---

## Understanding Electron Architecture

If you are new to Electron, here is the mental model you need: **Electron is Chrome with Node.js powers**. Every Electron app runs two types of processes:

### The Main Process

This is a Node.js process that runs our `src/electron/main.ts` file. It has full access to Node.js APIs and Electron's native modules. It can read files, show native dialogs, create system tray icons, and manage windows. There is exactly one main process per application.

Think of the main process as the "backend" of your desktop app. It handles things that a browser cannot do: accessing the filesystem, showing native OS dialogs, managing application lifecycle events.

### The Renderer Process

This is where our React application runs. Each `BrowserWindow` spawns its own renderer process - essentially a Chromium instance. The renderer has access to web APIs but, for security reasons, does not have direct access to Node.js or Electron's native modules.

Think of the renderer as a sandboxed browser tab. It can do everything a web page can do, but it cannot directly touch the filesystem or spawn processes. This is intentional - we want to protect users from malicious code.

### The Preload Script

The preload script is the bridge between these two worlds. It runs in the renderer's context but with special privileges - it can use some Node.js features and Electron's IPC (Inter-Process Communication) module. Our preload script (`src/electron/preload.ts`) exposes a carefully curated API to the renderer through `window.electronAPI`.

Here is how data flows:

```
┌─────────────────────────────────────────────────────────────────┐
│                      MAIN PROCESS (Node.js)                     │
│                                                                 │
│  src/electron/main.ts                                          │
│  - Creates BrowserWindow                                       │
│  - Registers IPC handlers                                      │
│  - Has full OS access                                          │
│                                                                 │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            │ IPC (ipcMain ↔ ipcRenderer)
                            │
┌───────────────────────────▼─────────────────────────────────────┐
│                     PRELOAD SCRIPT                              │
│                                                                 │
│  src/electron/preload.ts                                       │
│  - Runs before renderer loads                                  │
│  - Exposes safe APIs via contextBridge                         │
│  - Creates window.electronAPI                                  │
│                                                                 │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            │ contextBridge.exposeInMainWorld
                            │
┌───────────────────────────▼─────────────────────────────────────┐
│                    RENDERER PROCESS (Chromium)                  │
│                                                                 │
│  src/main.tsx + React app                                      │
│  - Standard React application                                  │
│  - Uses window.electronAPI for native features                 │
│  - Sandboxed for security                                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## How Our Desktop App Works

Let us walk through what happens when you launch the desktop app.

### Startup Sequence

1. **Electron starts the main process.** It loads `dist/electron/main.js` (our compiled TypeScript).

2. **We disable hardware acceleration.** This line in `main.ts` prevents rendering issues on some Linux systems and WSL:

   ```typescript
   app.disableHardwareAcceleration();
   ```

   We lose some GPU-accelerated rendering, but we gain stability across a wider range of systems.

3. **IPC handlers are registered.** Before creating any windows, we call `registerIPCHandlers()`. This sets up all the communication channels the renderer will use.

4. **The app waits for the 'ready' event.** Electron tells us when it has finished initializing.

5. **We create a BrowserWindow.** Here is the configuration we use:

   ```typescript
   mainWindow = new BrowserWindow({
     width: 1200,
     height: 800,
     webPreferences: {
       preload: path.join(__dirname, 'preload.js'),
       nodeIntegration: false,
       contextIsolation: true,
       sandbox: true,
     },
   });
   ```

   The `webPreferences` are security-critical. We disable `nodeIntegration` so the renderer cannot access Node.js directly. We enable `contextIsolation` so the preload script's context is separate from the renderer's. We enable `sandbox` for additional OS-level isolation.

6. **We load the content.** In development, we connect to the Vite dev server. In production, we load the bundled HTML file:

   ```typescript
   if (process.env.NODE_ENV === 'development') {
     const rendererPort = await waitForPort([5174, 5173, 5175], 'localhost');
     await mainWindow.loadURL(`http://localhost:${rendererPort}`);
   } else {
     await mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
   }
   ```

   Notice we try multiple ports in development. This handles the case where another process is already using the default port.

### The React Application

Once the BrowserWindow loads, our React application starts just like it would in a browser. The entry point is `src/main.tsx`:

```typescript
const isElectron =
  typeof window !== 'undefined' && 'electronAPI' in window && Boolean(window.electronAPI);
```

This detection lets us conditionally render desktop-specific UI or enable features that only make sense in Electron.

---

## IPC Communication: Bridging Two Worlds

The magic of our desktop app is in the IPC layer. Let us trace through a real example: showing a native file picker dialog.

### Step 1: Define the Types

We start with type definitions in `src/electron/types/ipc.ts`:

```typescript
export type IPCChannelMap = {
  'get-app-version': { args: []; result: string };
  'show-open-dialog': { args: [OpenDialogOptions]; result: string[] | null };
  'show-save-dialog': { args: [SaveDialogOptions]; result: string | null };
};
```

This map defines every IPC channel, its arguments, and its return type. TypeScript will catch any mismatches at compile time.

### Step 2: Implement the Handler

In `src/electron/ipc/handlers.ts`, we register the actual implementation:

```typescript
ipcMain.handle('show-open-dialog', async (_event, options: OpenDialogOptions) => {
  const mainWindow = getMainWindow();
  if (!mainWindow) return null;

  const result = await dialog.showOpenDialog(mainWindow, {
    title: options.title,
    filters: options.filters,
    properties: options.multiple ? ['openFile', 'multiSelections'] : ['openFile'],
  });

  return result.canceled ? null : result.filePaths;
});
```

This runs in the main process. It has access to Electron's `dialog` module, which can show native OS dialogs.

### Step 3: Expose Through Preload

In `src/electron/preload.ts`, we create a type-safe wrapper:

```typescript
function invoke<K extends IPCChannel>(
  channel: K,
  ...args: IPCChannelMap[K]['args']
): Promise<IPCChannelMap[K]['result']> {
  return ipcRenderer.invoke(channel, ...args);
}

const electronBridge: NativeBridge = {
  showOpenDialog: (options) => invoke('show-open-dialog', options),
  // ... other methods
};

contextBridge.exposeInMainWorld('electronAPI', electronBridge);
```

The `contextBridge.exposeInMainWorld` call makes our bridge available as `window.electronAPI` in the renderer.

### Step 4: Use from the Renderer

Now any React component can show a native file picker:

```typescript
const files = await window.electronAPI?.showOpenDialog({
  title: 'Select an image',
  filters: [{ name: 'Images', extensions: ['png', 'jpg', 'gif'] }],
  multiple: true,
});

if (files) {
  console.log('User selected:', files);
}
```

The entire flow is type-safe. If you mistype a channel name or pass wrong arguments, TypeScript will tell you.

---

## The NativeBridge Contract

We define a `NativeBridge` interface in `packages/core/src/contracts/native.ts`:

```typescript
export interface NativeBridge {
  getPlatform: () => Promise<string>;
  sendNotification: (title: string, body: string) => void;
  isNative: () => boolean;
  getAppVersion: () => Promise<string>;
  openExternal: (url: string) => Promise<void>;
  showOpenDialog?: (options: {...}) => Promise<string[] | null>;
  showSaveDialog?: (options: {...}) => Promise<string | null>;
}
```

This interface lives in `packages/core` because it defines a contract that any native platform must implement. Our Electron preload script implements this interface. A future React Native app could implement the same interface with different underlying calls.

The renderer code can then use `window.electronAPI` without knowing whether it is running in Electron, Tauri, or some other native wrapper. We augment the global `Window` type in `src/types.d.ts`:

```typescript
declare global {
  interface Window {
    electronAPI?: NativeBridge;
  }
}
```

---

## Development Workflow

### Running the Desktop App

The recommended way to develop is from the monorepo root:

```bash
# Starts web server, API server, and desktop app together
pnpm dev
```

This ensures all services are running and the desktop app can connect to the right dev server.

For standalone development:

```bash
# Starts its own Vite renderer on port 5174
pnpm --filter @abe-stack/desktop dev:standalone
```

Or if you already have the Vite dev server running:

```bash
# Just launches Electron, connects to existing dev server
pnpm --filter @abe-stack/desktop dev
```

### Hot Reloading

The renderer supports full hot module replacement through Vite. Change a React component and see it update instantly.

The main process does not hot reload. If you change `main.ts` or `preload.ts`, you need to restart the Electron process. We could add tools like `electron-reload`, but we find that main process changes are infrequent enough that manual restarts are acceptable.

### Testing

```bash
# Run all desktop tests
pnpm --filter @abe-stack/desktop test

# Watch mode
pnpm --filter @abe-stack/desktop test:watch
```

We test the main process code by mocking Electron's APIs. See `src/electron/__tests__/main.test.ts` for examples. The key insight is using `vi.hoisted()` to ensure mocks are available when modules are imported.

---

## Building and Packaging

### Build Steps

```bash
# Build everything (renderer + electron main process)
pnpm --filter @abe-stack/desktop build
```

This runs two build steps:

1. **Renderer build**: Vite bundles our React app into `dist/renderer/`
2. **Electron build**: esbuild bundles `main.ts` and `preload.ts` into `dist/electron/`

We use esbuild for the Electron build because:

- It is fast (sub-second builds)
- It handles the CommonJS/ESM boundary cleanly
- It bundles our Node.js code with all dependencies except `electron` itself

### Packaging for Distribution

```bash
# Create distributable packages
pnpm --filter @abe-stack/desktop package
```

This uses `electron-builder` to create platform-specific packages:

- **Windows**: NSIS installer (`.exe`)
- **macOS**: DMG disk image (`.dmg`)
- **Linux**: AppImage (`.AppImage`)

The configuration lives in `package.json` under the `build` key:

```json
{
  "build": {
    "appId": "com.abe-stack.desktop",
    "productName": "Abe Stack",
    "directories": {
      "output": "release"
    },
    "files": ["dist/**/*", "public/**/*"],
    "mac": { "category": "public.app-category.productivity" },
    "win": { "target": "nsis" },
    "linux": { "target": "AppImage" }
  }
}
```

---

## Project Structure

```
apps/desktop/
├── src/
│   ├── electron/               # Main process code
│   │   ├── main.ts             # Entry point, creates BrowserWindow
│   │   ├── preload.ts          # Bridge between main and renderer
│   │   ├── ipc/
│   │   │   ├── handlers.ts     # IPC handler implementations
│   │   │   └── index.ts        # Barrel export
│   │   ├── types/
│   │   │   ├── ipc.ts          # Type definitions for IPC channels
│   │   │   └── index.ts        # Barrel export
│   │   ├── utils/
│   │   │   └── index.ts        # Re-exports from @abe-stack/core
│   │   ├── tsconfig.json       # Node/ESM config for electron code
│   │   └── __tests__/          # Tests for main process
│   ├── main.tsx                # Renderer entry point (React)
│   ├── types.d.ts              # Global type augmentations
│   └── __tests__/              # Tests for renderer
├── index.html                  # HTML template for renderer
├── package.json                # Dependencies and scripts
├── tsconfig.json               # React/Vite config for renderer
└── dist/                       # Build output
    ├── electron/               # Compiled main process
    └── renderer/               # Bundled web app
```

---

## TypeScript Configuration

We maintain two separate TypeScript configurations because the main process and renderer run in fundamentally different environments.

### Renderer (`tsconfig.json`)

```json
{
  "extends": "../../config/ts/tsconfig.react.json",
  "compilerOptions": {
    "types": ["vite/client", "react", "react-dom"],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "exclude": ["src/electron"]
}
```

This configuration:

- Extends our shared React config
- Includes Vite client types for HMR
- Excludes the electron directory (handled separately)

### Main Process (`src/electron/tsconfig.json`)

```json
{
  "extends": "../../../../config/ts/tsconfig.node.json",
  "compilerOptions": {
    "module": "ESNext",
    "moduleResolution": "bundler",
    "types": ["node"]
  }
}
```

This configuration:

- Extends our shared Node.js config
- Uses bundler module resolution (we use esbuild)
- Only includes Node.js types

The key insight is that these two codebases never mix at compile time. The preload script imports types from `@abe-stack/core`, but esbuild bundles everything at build time.

---

## Security Considerations

Security in Electron requires deliberate effort. Here are the measures we take:

### Sandbox Mode

We enable the sandbox for the renderer:

```typescript
webPreferences: {
  sandbox: true,
}
```

This provides OS-level isolation. Even if an attacker finds an exploit in our renderer code, they cannot directly access the filesystem or network.

### Context Isolation

```typescript
webPreferences: {
  contextIsolation: true,
}
```

This ensures the preload script and renderer cannot share JavaScript objects directly. Communication happens only through the structured clone algorithm, preventing prototype pollution attacks.

### No Node Integration

```typescript
webPreferences: {
  nodeIntegration: false,
}
```

The renderer cannot `require()` Node.js modules. This is critical - if an attacker injects JavaScript into our renderer, they should not gain Node.js capabilities.

### Minimal API Surface

Our preload script exposes only the APIs we actually need:

```typescript
const electronBridge: NativeBridge = {
  getPlatform: () => Promise.resolve('electron'),
  sendNotification: (title, body) => {
    /* ... */
  },
  isNative: () => true,
  getAppVersion: () => invoke('get-app-version'),
  openExternal: async (url) => {
    await shell.openExternal(url);
  },
  showOpenDialog: (options) => invoke('show-open-dialog', options),
  showSaveDialog: (options) => invoke('show-save-dialog', options),
};
```

We do not expose `shell.openPath()` or `fs` access. Every API we add is a potential attack vector, so we add them deliberately.

---

## Platform-Specific Behavior

Electron runs on Windows, macOS, and Linux. We handle platform differences in a few places:

### Window Lifecycle

macOS keeps applications running even when all windows are closed. Other platforms exit:

```typescript
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    void createWindow();
  }
});
```

The `activate` event fires when clicking the dock icon on macOS after closing all windows.

### Notifications

We check if the platform supports notifications before showing them:

```typescript
ipcMain.on('show-notification', (_event, { title, body }) => {
  if (Notification.isSupported()) {
    new Notification({ title, body }).show();
  }
});
```

### Hardware Acceleration

We disable hardware acceleration globally due to issues on Linux/WSL:

```typescript
app.disableHardwareAcceleration();
```

On Windows and macOS, this may not be necessary, but we prefer consistent behavior across platforms over marginal performance gains.

---

## Adding Desktop-Specific Features

Here is the pattern for adding new native capabilities:

### 1. Define the Type

Add your channel to `src/electron/types/ipc.ts`:

```typescript
export type IPCChannelMap = {
  // existing channels...
  'read-clipboard': { args: []; result: string };
};
```

### 2. Implement the Handler

Add the implementation in `src/electron/ipc/handlers.ts`:

```typescript
import { clipboard } from 'electron';

ipcMain.handle('read-clipboard', () => {
  return clipboard.readText();
});
```

### 3. Expose in Preload

Update `src/electron/preload.ts`:

```typescript
const electronBridge: NativeBridge = {
  // existing methods...
  readClipboard: () => invoke('read-clipboard'),
};
```

If this is a new method, you will need to update the `NativeBridge` interface in `packages/core`.

### 4. Update Types

Add the method to `packages/core/src/contracts/native.ts`:

```typescript
export interface NativeBridge {
  // existing methods...
  readClipboard?: () => Promise<string>;
}
```

### 5. Use in Renderer

```typescript
const text = await window.electronAPI?.readClipboard();
```

---

## Trade-offs and Design Decisions

### Why a Thin Wrapper?

Our desktop app is intentionally minimal. We load the same React application that runs in the browser. This maximizes code reuse but means we cannot easily customize the desktop experience.

Alternative approaches:

- **Feature flags**: Check `window.electronAPI` and render different UI
- **Platform-specific routes**: Load different page components on desktop
- **Separate renderer**: Build a completely different UI for desktop

We chose the thin wrapper because our application does not need significant desktop-specific UI. If yours does, consider the alternatives.

### Why esbuild for Electron?

We use esbuild instead of tsc to compile the main process:

```json
"build:electron": "esbuild src/electron/main.ts src/electron/preload.ts --bundle --platform=node --target=node20 --outdir=dist/electron --external:electron --format=cjs"
```

Benefits:

- Much faster than tsc (milliseconds vs seconds)
- Bundles dependencies into single files
- Handles ESM/CommonJS interop cleanly

Trade-offs:

- No incremental compilation (full rebuild each time)
- Less integrated with TypeScript's type checking

We run `tsc --noEmit` separately for type checking.

### Why Disable Hardware Acceleration?

We call `app.disableHardwareAcceleration()` because:

- It prevents crashes on some Linux systems
- It resolves issues in WSL2 environments
- The performance impact is negligible for our UI

If you are building a graphics-intensive application (video player, game), you might need to enable it and handle the edge cases differently.

### Why CommonJS Output?

Electron's main process expects CommonJS modules. Our esbuild config outputs `--format=cjs`. While Electron has experimental ESM support, CommonJS remains more reliable for production use.

---

## Troubleshooting

### The window is blank / shows white screen

1. Check if the Vite dev server is running
2. Look at the Electron console for errors (View > Toggle Developer Tools)
3. Verify the port configuration matches between Vite and Electron

### IPC calls return undefined

1. Check that the handler is registered in `handlers.ts`
2. Verify the channel name matches exactly
3. Ensure the preload script is being loaded (check `webPreferences.preload` path)

### App crashes on Linux

1. Ensure hardware acceleration is disabled
2. Check for missing system dependencies (`libgtk-3-0`, `libnss3`)
3. Try running with `--no-sandbox` flag (not recommended for production)

### Build fails with "cannot find module"

1. Run `pnpm install` from the monorepo root
2. Ensure `@abe-stack/core` is built (`pnpm --filter @abe-stack/core build`)
3. Check that path aliases are correctly configured

### Tests fail with "cannot use import statement"

1. Ensure vitest config handles the Electron mocks correctly
2. Check that `vi.mock()` calls come before imports
3. Use `vi.hoisted()` for mock setup that needs to run early

---

## Dependencies

**Runtime:**

- `react`, `react-dom`: UI framework
- `@abe-stack/core`: Shared business logic and contracts
- `@abe-stack/ui`: Shared UI components

**Development:**

- `electron`: Desktop runtime
- `electron-builder`: Packaging and distribution
- `esbuild`: Fast bundler for main process

---

**This desktop app demonstrates that you can ship a professional desktop application while sharing most of your code with a web app. The key is understanding Electron's process model and respecting its security boundaries.**

---

_Last Updated: 2026-01-21_
