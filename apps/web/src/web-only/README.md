# Web-Specific Features

This directory contains browser-specific features that are NOT shared with the desktop app.

## What Goes Here

- **Service Workers**: PWA service worker registration
- **Web APIs**: Browser-only APIs (Geolocation, Web Bluetooth, etc.)
- **Analytics**: Web analytics tracking (Google Analytics, etc.)
- **SEO**: Meta tags, structured data
- **OAuth Redirects**: Browser-based OAuth flows
- **Web Push**: Browser push notifications

## Example Structure

```
web-only/
├── hooks/
│   ├── useGeolocation.ts     # Browser geolocation
│   ├── useWebPush.ts         # Web push notifications
│   └── useAnalytics.ts       # Analytics tracking
├── services/
│   ├── serviceWorker.ts      # PWA service worker
│   └── analytics.ts          # Analytics service
└── components/
    └── SEOHead.tsx           # SEO meta tags
```

## Usage

```typescript
// In web App.tsx
import { useGeolocation } from './web-only/hooks/useGeolocation';

function WebFeature() {
  const { latitude, longitude } = useGeolocation();

  return (
    <div>
      Location: {latitude}, {longitude}
    </div>
  );
}
```

## Important

- These features will NOT work in the desktop app
- Always check if running in browser before using:
  ```typescript
  if (typeof window !== 'undefined' && !window.electronAPI) {
    // Use web-only features
  }
  ```
