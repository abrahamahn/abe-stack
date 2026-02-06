// apps/desktop/src/main.tsx
import { QueryCache } from '@abe-stack/client-engine';
import '@abe-stack/ui/styles/elements.css';
import { App } from '@app/App';
import { clientConfig } from '@config';
import { createAuthService } from '@features/auth';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import type { ClientEnvironment } from '@app/ClientEnvironment';

// ============================================================================
// Service Creation
// ============================================================================

const queryCache = new QueryCache({
  defaultStaleTime: 5 * 60 * 1000,
  defaultGcTime: 24 * 60 * 60 * 1000,
  refetchOnWindowFocus: true,
  refetchOnReconnect: true,
});

const auth = createAuthService({
  config: clientConfig,
});

const environment: ClientEnvironment = {
  config: clientConfig,
  queryCache,
  auth,
};

void environment.auth.initialize();

if (environment.config.isDev) {
  (window as unknown as { environment: ClientEnvironment }).environment = environment;
}

// ============================================================================
// Render Application
// ============================================================================

const container = document.getElementById('root');

if (container === null) {
  throw new Error('Root container not found');
}

const root = createRoot(container);

root.render(
  <StrictMode>
    <App environment={environment} />
  </StrictMode>,
);
