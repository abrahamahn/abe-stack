// packages/ui/src/test/mocks/handlers.ts
import type { RequestHandler } from 'msw';

/**
 * MSW Request Handlers
 *
 * Define mock API handlers for testing.
 * Add handlers as needed for your component tests.
 *
 * Example usage:
 * ```ts
 * import { http, HttpResponse } from 'msw';
 *
 * export const handlers = [
 *   http.get('/api/user/:id', ({ params }) => {
 *     return HttpResponse.json({ id: params.id, name: 'John Doe' });
 *   }),
 *   http.post('/api/login', async ({ request }) => {
 *     const body = await request.json();
 *     return HttpResponse.json({ token: 'mock-token' });
 *   }),
 * ];
 * ```
 */

export const handlers: RequestHandler[] = [
  // Add your mock handlers here
  // Import http and HttpResponse from 'msw' when you add handlers
  // Example: API endpoint mocks for UI components that make network requests
];
