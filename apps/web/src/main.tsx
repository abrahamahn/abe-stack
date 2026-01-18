// apps/web/src/main.tsx
/**
 * Application entry point.
 *
 * Following chet-stack pattern:
 * - Services are created at module level (before React renders)
 * - Environment is passed as prop to AppProvider
 */

import { createClientEnvironment } from '@app/createEnvironment';
import { App } from '@app/root';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import '@abe-stack/ui/styles/elements.css';

// ============================================================================
// Module-level Initialization
// ============================================================================

// Create the environment once at module level
// This ensures all services are ready before React renders
const environment = createClientEnvironment();

// Initialize auth state on startup (non-blocking)
// This will restore auth state from refresh token cookie if available
void environment.auth.initialize();

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
    <App environment={environment} />
  </StrictMode>,
);
