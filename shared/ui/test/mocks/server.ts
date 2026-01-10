// packages/ui/src/test/mocks/server.ts
import { setupServer } from 'msw/node';

import { handlers } from './handlers';

/**
 * MSW Server Setup
 *
 * This creates a mock server that intercepts network requests during tests.
 * The server is configured in test/setup.ts to start before tests and clean up after.
 *
 * Usage in tests:
 * ```ts
 * import { server } from '@/test/mocks/server';
 * import { http, HttpResponse } from 'msw';
 *
 * it('handles error response', async () => {
 *   // Override handler for this test
 *   server.use(
 *     http.get('/api/user', () => {
 *       return HttpResponse.json({ error: 'Not found' }, { status: 404 });
 *     })
 *   );
 *
 *   // Test component that calls /api/user
 * });
 * ```
 */

export const server = setupServer(...handlers);
