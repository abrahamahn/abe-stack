// apps/web/src/main.tsx
/**
 * Application entry point.
 *
 * Services are initialized at module level via getClientEnvironment().
 * This ensures all services are ready before React renders.
 */

import { getClientEnvironment } from '@app';
import { App } from '@app/root';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import '@abe-stack/ui/styles/elements.css';

// ============================================================================
// Module-level Initialization
// ============================================================================

// Get the environment (creates it if not already created)
const environment = getClientEnvironment();

// Fetch current user on startup (non-blocking)
// This will restore auth state if there's a valid token
void environment.auth.fetchCurrentUser();

// For debugging from the Console
if (environment.config.isDev) {
  (window as unknown as { environment: typeof environment }).environment = environment;
}

// ============================================================================
// Render Application
// ============================================================================

type GetElementById = (elementId: string) => HTMLElement | null;

const documentRef = document as unknown as { getElementById: GetElementById };
const rootElement = documentRef.getElementById('root');
if (!rootElement) throw new Error('Failed to find the root element');

const root = createRoot(rootElement);
root.render(
  <StrictMode>
    <App />
  </StrictMode>,
);
