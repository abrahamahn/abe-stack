// main/apps/web/src/main.tsx
/**
 * Application entry point.
 *
 * Following chet-stack pattern:
 * - All services created at module level (before React renders)
 * - Environment assembled inline and passed to App
 */

import { QueryCache } from '@bslt/client-engine';
import { MS_PER_DAY, MS_PER_MINUTE } from '@bslt/shared';
import { createAuthService } from '@features/auth';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './app/App';
import { onTosRequired } from './app/tosHandler';
import { registerServiceWorker } from './utils/registerServiceWorker';

import type { ClientEnvironment } from '@app/ClientEnvironment';

import { clientConfig } from '@/config';

import '@bslt/ui/styles/elements.css';

// ============================================================================
// Service Creation (module level, before React renders)
// ============================================================================

const queryCache = new QueryCache({
  defaultStaleTime: 5 * MS_PER_MINUTE,
  defaultGcTime: MS_PER_DAY,
  refetchOnWindowFocus: true,
  refetchOnReconnect: true,
});

const auth = createAuthService({
  config: clientConfig,
  onTosRequired,
});

// ============================================================================
// Assemble Environment
// ============================================================================

const environment: ClientEnvironment = {
  config: clientConfig,
  queryCache,
  auth,
};

// Initialize auth state on startup (non-blocking)
// This will restore auth state from refresh token cookie if available
void environment.auth.initialize();

// ============================================================================
// Debug Access
// ============================================================================

if (environment.config.isDev) {
  (window as unknown as { environment: ClientEnvironment }).environment = environment;
}

// ============================================================================
// Render Application
// ============================================================================

type GetElementById = (elementId: string) => HTMLElement | null;

const documentRef = document as unknown as { getElementById: GetElementById };
const rootElement = documentRef.getElementById('root');
if (rootElement === null) throw new Error('Failed to find the root element');

const root = createRoot(rootElement);
root.render(
  <StrictMode>
    <App environment={environment} />
  </StrictMode>,
);

// ============================================================================
// Service Worker Registration (PWA offline support)
// ============================================================================

// Register service worker in production only
// In development, service workers can interfere with hot module replacement
if (!environment.config.isDev) {
  void registerServiceWorker({
    swPath: '/sw.js',
    scope: '/',
    immediate: false, // Wait for page load to avoid blocking initial render
    callbacks: {
      onSuccess: (_registration) => {
        // Service worker registered successfully
        // In production, you might want to track this with analytics
      },
      onUpdate: (_info) => {
        // New version available - could show a toast notification here
        // Example: showToast('A new version is available. Refresh to update.')
      },
      onError: (_error) => {
        // Service worker registration failed
        // In production, you might want to track this with error monitoring
      },
    },
  });
}
