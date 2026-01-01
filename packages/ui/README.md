# @abeahn/ui - Shared UI Package

**Shared React components for web, desktop, and mobile platforms.**

Write once, use everywhere. This package contains all shared UI components that achieve **80-90% code reuse** across platforms.

## Table of Contents

- [Documentation](#documentation)
- [Overview](#overview)
- [Architecture](#architecture)
- [Directory Structure](#directory-structure)
- [What Goes Here](#what-goes-here)
- [Usage Examples](#usage-examples)
- [Code Sharing Breakdown](#code-sharing-breakdown)
- [Decision Flow](#decision-flow-where-should-code-go)
- [Adding New Components](#adding-new-components)
- [Platform Adaptations](#platform-adaptations)
- [Testing](#testing)
- [Best Practices](#best-practices)

---

## Documentation

**📚 [View Complete Component Documentation](./docs/README.md)**

Comprehensive documentation for all 46 components including:

- Detailed usage examples (basic to advanced)
- Complete props reference with TypeScript types
- Accessibility guidelines and ARIA patterns
- Keyboard navigation tables
- Do's and Don'ts
- Related components and cross-references

**Quick links:**

- [Components](./docs/README.md#components) - Core UI components (8 components)
- [elements](./docs/README.md#elements) - Low-level elements (32 components)
- [Layouts](./docs/README.md#layouts) - Layout components (6 layouts)

---

## Overview

This package is the heart of abe-stack's **Option 3 architecture** - the shared UI package pattern.

### Philosophy

**Write once, use everywhere.**

By centralizing UI components in this package, we achieve:

- 🎯 **80-90% code reuse** across platforms
- 🔄 **Single source of truth** for UI logic
- 🚀 **Faster feature development** (build once, deploy to all platforms)
- 🐛 **Fix bugs once** instead of in multiple places
- 🎨 **Consistent design** across all platforms

### Used By

- ✅ **Web app** (`apps/web`) - Renders in browser
- ✅ **Desktop app** (`apps/desktop`) - Renders in Electron/Tauri
- ✅ **Mobile app** (`apps/mobile`) - Adapts for React Native

---

## Architecture

### Architecture Diagram

```text
┌─────────────────────────────────────────────────────────────────┐
│                      abe-stack Monorepo                         │
└─────────────────────────────────────────────────────────────────┘

┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  apps/web    │  │apps/desktop  │  │apps/mobile   │  │apps/server   │
│              │  │              │  │              │  │              │
│  Web-only    │  │Desktop-only  │  │Mobile-only   │  │Backend API   │
│  features    │  │features      │  │features      │  │              │
│              │  │              │  │              │  │              │
│  ├─ src/     │  │ ├─ electron/ │  │ ├─ android/  │  │ ├─ src/      │
│  │  ├─ web-  │  │ ├─ native/   │  │ ├─ ios/      │  │ │  ├─adapters│
│  │  │  only/ │  │ │  (desktop) │  │ └─ native/   │  │ │  ├─ core/  │
│  │  └─App.tsx│  │ └─App.tsx    │  │    (mobile)  │  │ │  └─modules/│
└──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────────────┘
       │                 │                 │
       │                 │                 │
       └─────────────────┼─────────────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │  packages/ui         │
              │                      │
              │  SHARED UI (80-90%)  │
              │                      │
              │  ├─ components/      │◄─── Button, Input, Card
              │  ├─ features/        │◄─── Auth, Media Player
              │  ├─ layouts/         │◄─── App Layout, Nav
              │  ├─ hooks/           │◄─── useAuth, useFetch
              │  └─ contexts/        │◄─── ThemeContext, etc.
              └──────────┬───────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │  packages/shared     │◄─── Business logic
              │  packages/config     │◄─── Shared configs
              └──────────────────────┘
```

---

## Directory Structure

```
packages/ui/src/
├── components/       # Base UI components (Button, Input, Card, etc.)
├── features/         # Feature modules (auth, media, player, etc.)
├── layouts/          # Page layouts and templates
├── hooks/            # Shared React hooks
├── contexts/         # React contexts for state management
└── index.ts          # Barrel export for easy imports
```

---

## What Goes Here

### ✅ DO Include

- **Presentational Components**: Buttons, inputs, cards, modals
- **Feature Components**: Auth forms, media players, search bars
- **Layout Components**: App shells, page templates, navigation
- **Shared Hooks**: Data fetching, form handling, UI state
- **Shared Contexts**: Theme, auth, global state
- **UI Logic**: Component behavior, validation, formatting

### ❌ DON'T Include

**Platform-specific features:**

- **Desktop**: File system, system tray, native menus → `apps/desktop/src/native/`
- **Web**: Service workers, web-only APIs → `apps/web/src/web-only/`
- **Mobile**: Native modules, device APIs → `apps/mobile/src/native/`

**Other:**

- **Backend logic**: API routes, database queries → `apps/server/`
- **Build configurations**: Webpack, Vite configs → `config/`

---

## Usage Examples

### In Web App

```typescript
// apps/web/src/pages/SomePage.tsx
import { Button, Card, Input } from '@abeahn/ui';
import { useAuth } from '@abeahn/ui';

function WebPage() {
  const { user } = useAuth();

  return (
    <Card>
      <h1>Welcome {user.name}</h1>
      <Input placeholder="Email" />
      <Button>Sign In</Button>
    </Card>
  );
}
```

### In Desktop App

```typescript
// apps/desktop/src/pages/SomePage.tsx
import { Button, Card, Input } from '@abeahn/ui';
import { useAuth } from '@abeahn/ui';
import { useFileSystem } from '../native/hooks/useFileSystem';

function DesktopPage() {
  const { user } = useAuth(); // Shared hook from @abeahn/ui
  const { openFile } = useFileSystem(); // Desktop-only

  return (
    <Card> {/* Shared component */}
      <h1>Welcome {user.name}</h1>
      <Button onClick={openFile}>Open File (Desktop Only)</Button>
    </Card>
  );
}
```

### In Mobile App

```typescript
// apps/mobile/src/screens/SomeScreen.tsx
import { Button, Card } from '@abeahn/ui';
import { useAuth } from '@abeahn/ui';
import { View } from 'react-native';

function MobileScreen() {
  const { user } = useAuth(); // Shared hook

  return (
    <View>
      <Card> {/* Shared component, adapted for React Native */}
        <h1>Welcome {user.name}</h1>
        <Button>Sign In</Button>
      </Card>
    </View>
  );
}
```

---

## Code Sharing Breakdown

### 📦 packages/ui (80-90% shared)

**What's shared:**

- ✅ All UI components (Button, Input, Card, Modal, etc.)
- ✅ Feature modules (Auth forms, Media player, Search)
- ✅ Page layouts and templates
- ✅ React hooks (useAuth, useFetch, useTheme)
- ✅ React contexts (AuthContext, ThemeContext)
- ✅ UI utilities and helpers

### 🌐 apps/web (10-20% web-specific)

**What's unique to web:**

- PWA service worker registration
- Web-only APIs (Geolocation, WebBluetooth)
- Analytics integration (Google Analytics)
- SEO meta tags and structured data
- Browser OAuth flows
- Web push notifications

**File structure:**

```
apps/web/src/
├── web-only/          # Web-specific features
│   ├── hooks/
│   ├── services/
│   └── components/
├── App.tsx           # Imports from @abeahn/ui
└── main.tsx          # Web entry point
```

### 🖥️ apps/desktop (10-20% desktop-specific)

**What's unique to desktop:**

- File system access
- System tray integration
- Native notifications
- Auto-updater
- Native menus
- IPC with Electron main process
- Window management

**File structure:**

```
apps/desktop/src/
├── native/           # Desktop-specific features
│   ├── hooks/
│   ├── services/
│   └── types/
├── electron/         # Electron main process
│   ├── main.ts
│   └── preload.ts
├── App.tsx          # Imports from @abeahn/ui
└── main.tsx         # Desktop entry point
```

### 📱 apps/mobile (10-20% mobile-specific)

**What's unique to mobile:**

- React Native navigation
- Native modules (Camera, Push, etc.)
- Mobile gestures
- Deep linking
- App state management
- Platform-specific UI adaptations

**File structure:**

```
apps/mobile/src/
├── native/          # Mobile-specific features
│   ├── hooks/
│   ├── navigation/
│   └── modules/
├── App.tsx         # Imports from @abeahn/ui
└── index.js        # Mobile entry point
```

---

## Decision Flow: Where Should Code Go?

```
┌─────────────────────────────────────┐
│ New component or feature needed?    │
└────────────┬────────────────────────┘
             │
             ▼
    ┌────────────────────┐
    │ Used on multiple   │
    │ platforms?         │
    └────┬──────────┬────┘
         │ YES      │ NO
         ▼          ▼
    ┌────────┐  ┌──────────────────┐
    │packages│  │ Platform-specific│
    │  /ui   │  │  apps/{platform} │
    └────────┘  └──────────────────┘
```

### Questions to Ask

1. **Will this be used in web, desktop, AND mobile?**
   - YES → `packages/ui`
   - NO → Continue...

2. **Does it use platform-specific APIs?**
   - File system, Electron API, React Native modules?
   - YES → `apps/{platform}/src/native/`
   - NO → `packages/ui`

3. **Is it pure UI or business logic?**
   - Pure UI → `packages/ui`
   - Business logic → `packages/shared`
   - Backend logic → `apps/server`

---

## Adding New Components

### 1. Create the Component

```typescript
// packages/ui/src/components/MyButton.tsx
import React from 'react';

export interface MyButtonProps {
  label: string;
  onClick?: () => void;
  variant?: 'primary' | 'secondary';
}

export default function MyButton({
  label,
  onClick,
  variant = 'primary'
}: MyButtonProps) {
  return (
    <button
      className={`btn btn-${variant}`}
      onClick={onClick}
    >
      {label}
    </button>
  );
}
```

### 2. Export from Barrel

```typescript
// packages/ui/src/components/index.ts
export { default as MyButton } from './MyButton';
```

### 3. Use Anywhere

```typescript
// In any app (web, desktop, mobile)
import { MyButton } from '@abeahn/ui';

<MyButton label="Click Me" variant="primary" />
```

---

## Platform Adaptations

Some components may need platform-specific behavior. Use props to handle this:

```typescript
// packages/ui/src/components/AdaptiveButton.tsx
import React from 'react';

export interface AdaptiveButtonProps {
  label: string;
  onClick?: () => void;
  platform?: 'web' | 'desktop' | 'mobile';
}

export default function AdaptiveButton({
  label,
  onClick,
  platform = 'web'
}: AdaptiveButtonProps) {
  // Adapt styling or behavior based on platform
  const className = platform === 'mobile'
    ? 'mobile-button'
    : 'desktop-button';

  return (
    <button className={className} onClick={onClick}>
      {label}
    </button>
  );
}
```

**Usage:**

```typescript
// In desktop app
<AdaptiveButton label="Click" platform="desktop" />

// In mobile app
<AdaptiveButton label="Click" platform="mobile" />
```

---

## Testing

Test components in isolation:

```typescript
// packages/ui/src/components/__tests__/Button.test.tsx
import { render, fireEvent } from '@testing-library/react';
import Button from '../Button';

describe('Button', () => {
  it('renders correctly', () => {
    const { getByText } = render(<Button>Click Me</Button>);
    expect(getByText('Click Me')).toBeInTheDocument();
  });

  it('handles click', () => {
    const onClick = jest.fn();
    const { getByText } = render(
      <Button onClick={onClick}>Click Me</Button>
    );

    fireEvent.click(getByText('Click Me'));
    expect(onClick).toHaveBeenCalled();
  });
});
```

---

## Best Practices

### 1. Default to Shared

Unless it's platform-specific, put it in `packages/ui`.

### 2. Keep Platforms Thin

Minimize platform-specific code. Most code should be in `packages/ui`.

### 3. Use Adapters

For platform differences, use props/hooks rather than separate components.

### 4. Keep Components Pure

Avoid side effects. Components should be predictable.

### 5. Type Everything

Use TypeScript interfaces and document props with JSDoc.

### 6. Test Thoroughly

Write unit tests for all shared components.

### 7. Stay Platform-Agnostic

No Electron/React Native-specific code in this package.

### 8. Use Composition

Build complex UIs from simple components.

### 9. Document Props

Add JSDoc comments for better IDE support.

### 10. Review Regularly

Refactor platform code to shared when patterns emerge.

---

## Benefits

| Benefit                      | Description                                     |
| ---------------------------- | ----------------------------------------------- |
| **80-90% Code Reuse**        | Write once, use everywhere                      |
| **Single Source of Truth**   | One place for UI components                     |
| **Faster Development**       | Build features once, deploy to all platforms    |
| **Easier Maintenance**       | Fix bugs in one place                           |
| **Consistent UX**            | Same components across platforms                |
| **Independent Optimization** | Each platform can optimize separately           |
| **Clear Boundaries**         | Separation between shared and platform-specific |
| **Better Testing**           | Test components in isolation                    |

---

## Trade-offs

| Aspect       | Benefit                         | Cost                                     |
| ------------ | ------------------------------- | ---------------------------------------- |
| Code Reuse   | 80-90% shared                   | Need discipline to keep code in packages |
| Architecture | Clean separation                | More initial setup                       |
| Maintenance  | Fix once                        | Need to maintain shared package          |
| Performance  | Platform-specific optimizations | Shared code must work for all            |
| Team         | Clear ownership boundaries      | Requires coordination                    |

---

## Dependencies

- **React** (peer dependency)
- **React DOM** (peer dependency)
- **React Router DOM** (peer dependency)
- **@abeahn/shared** (workspace dependency for utilities)

Avoid adding platform-specific dependencies (Electron, React Native modules) to this package.

---

## Example: Building a Cross-Platform Feature

### Shared Component (packages/ui)

```typescript
// packages/ui/src/features/player/MusicPlayer.tsx
import React from 'react';
import { Button, Card } from '../../components';

export interface MusicPlayerProps {
  track: Track;
  onPlay?: () => void;
  onPause?: () => void;
}

export function MusicPlayer({ track, onPlay, onPause }: MusicPlayerProps) {
  return (
    <Card>
      <h3>{track.title}</h3>
      <Button onClick={onPlay}>Play</Button>
      <Button onClick={onPause}>Pause</Button>
    </Card>
  );
}
```

### Web Usage

```typescript
// apps/web/src/pages/PlayerPage.tsx
import { MusicPlayer } from '@abeahn/ui';
import { useWebAnalytics } from '../web-only/hooks/useAnalytics';

function PlayerPage() {
  const analytics = useWebAnalytics(); // Web-only

  const handlePlay = () => {
    analytics.track('play_clicked'); // Web-specific
  };

  return <MusicPlayer track={track} onPlay={handlePlay} />;
}
```

### Desktop Usage

```typescript
// apps/desktop/src/pages/PlayerPage.tsx
import { MusicPlayer } from '@abeahn/ui';
import { useNotifications } from '../native/hooks/useNotifications';

function PlayerPage() {
  const notify = useNotifications(); // Desktop-only

  const handlePlay = () => {
    notify('Now playing...'); // Desktop-specific
  };

  return <MusicPlayer track={track} onPlay={handlePlay} />;
}
```

### Mobile Usage

```typescript
// apps/mobile/src/screens/PlayerScreen.tsx
import { MusicPlayer } from '@abeahn/ui';
import { Haptics } from 'react-native-haptic-feedback';

function PlayerScreen() {
  const handlePlay = () => {
    Haptics.trigger('impactLight'); // Mobile-specific
  };

  return <MusicPlayer track={track} onPlay={handlePlay} />;
}
```

**Result:** Same `MusicPlayer` component, platform-specific enhancements!

---

## Getting Started

1. **Install dependencies:**

   ```bash
   pnpm install
   ```

2. **Build the UI package:**

   ```bash
   pnpm --filter @abeahn/ui build
   ```

3. **Import in your apps:**

   ```typescript
   import { Button, Card, Input } from '@abeahn/ui';
   ```

4. **Add platform-specific features:**
   - Web: `apps/web/src/web-only/`
   - Desktop: `apps/desktop/src/native/`
   - Mobile: `apps/mobile/src/native/`

---

**This architecture gives you the best of both worlds:**

- ✅ Maximum code reuse through shared UI
- ✅ Platform-specific optimizations when needed
- ✅ Clear boundaries and maintainability
- ✅ Independent deployment of each platform

Happy coding! 🎉
