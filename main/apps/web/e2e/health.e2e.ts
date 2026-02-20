// main/apps/web/e2e/health.e2e.ts
/**
 * Health Endpoint E2E Tests (4.15)
 *
 * Verifies that health endpoints are accessible from the browser
 * without authentication. These are public system endpoints.
 */

import { test, expect } from '@playwright/test';

const BASE_URL = process.env['E2E_BASE_URL'];

test.describe('Health Endpoint — Browser Accessible (No Auth Required)', () => {
  test.skip(BASE_URL === undefined, 'Set E2E_BASE_URL to run E2E tests');

  test('GET /health returns 200 with ok status from browser', async ({ page }) => {
    const response = await page.goto(`${BASE_URL}/health`);
    expect(response).not.toBeNull();
    expect(response!.status()).toBe(200);

    const body = await response!.json();
    expect(body.status).toBeDefined();
    expect(['ok', 'degraded']).toContain(body.status);
    expect(body.timestamp).toBeDefined();
  });

  test('GET /health/live returns 200 with alive status', async ({ page }) => {
    const response = await page.goto(`${BASE_URL}/health/live`);
    expect(response).not.toBeNull();
    expect(response!.status()).toBe(200);

    const body = await response!.json();
    expect(body.status).toBe('alive');
    expect(typeof body.uptime).toBe('number');
    expect(body.uptime).toBeGreaterThan(0);
  });

  test('GET /health/ready returns readiness status', async ({ page }) => {
    const response = await page.goto(`${BASE_URL}/health/ready`);
    expect(response).not.toBeNull();
    // Either 200 (ready) or 503 (not ready) are valid
    expect([200, 503]).toContain(response!.status());

    const body = await response!.json();
    expect(['ready', 'not_ready']).toContain(body.status);
    expect(body.timestamp).toBeDefined();
  });

  test('GET /health does not require cookies or auth headers', async ({ request }) => {
    // Using request context directly (no session, no cookies)
    const response = await request.get(`${BASE_URL}/health`);
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.status).toBeDefined();
  });

  test('GET /health returns JSON content-type', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/health`);
    expect(response.status()).toBe(200);

    const contentType = response.headers()['content-type'];
    expect(contentType).toContain('application/json');
  });
});
