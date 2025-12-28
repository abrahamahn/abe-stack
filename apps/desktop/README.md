# Abe Stack Desktop App

Electron desktop application for abe-stack.

## Features

- Built with Electron and React
- TypeScript support
- Hot reload in development
- Cross-platform (Windows, macOS, Linux)

## Development

```bash
# Install dependencies
pnpm install

# Run in development mode
pnpm dev

# Build for production
pnpm build

# Package the app
pnpm package
```

## Project Structure

```
desktop/
├── electron/           # Electron main process
│   ├── main.ts        # Main process entry
│   └── preload.ts     # Preload script
├── src/               # React renderer process
│   ├── App.tsx
│   └── main.tsx
├── public/            # Static assets
└── dist/              # Build output
```

## Building

The app can be built for multiple platforms:

- **Windows**: Creates NSIS installer
- **macOS**: Creates DMG
- **Linux**: Creates AppImage

## Next Steps

1. Implement your desktop app features in `src/`
2. Add IPC communication between main and renderer processes
3. Configure auto-updates
4. Add application menu
5. Implement native features (notifications, system tray, etc.)
