// main/server/core/src/consent/index.ts
/**
 * Consent Package
 *
 * Business logic, HTTP handlers, and route definitions for
 * GDPR consent management and preference tracking.
 */

// Service
export { getUserConsent, updateUserConsent } from './service';

// Handlers
export { handleGetConsent, handleUpdateConsent } from './handlers';

// Routes
export { consentRoutes } from './routes';

// Types
export type {
  ConsentAppContext,
  ConsentPreferences,
  ConsentRequest,
  UpdateConsentInput,
} from './types';
