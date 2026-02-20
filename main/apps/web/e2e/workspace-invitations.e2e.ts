// main/apps/web/e2e/workspace-invitations.e2e.ts
/**
 * Workspace Invitations E2E
 *
 * Flow:
 * 1) Owner/admin logs in
 * 2) Invite member
 * 3) Invitee accepts invitation
 * 4) Owner changes member role
 * 5) Owner removes member
 */

import { expect, test } from '@playwright/test';

const baseURL = process.env['E2E_BASE_URL'] ?? 'http://localhost:5173';
const ownerEmail = process.env['E2E_OWNER_EMAIL'] ?? process.env['E2E_EMAIL'];
const ownerPassword = process.env['E2E_OWNER_PASSWORD'] ?? process.env['E2E_PASSWORD'];
const inviteeEmail = process.env['E2E_INVITEE_EMAIL'];
const inviteePassword = process.env['E2E_INVITEE_PASSWORD'];
const tenantId = process.env['E2E_TENANT_ID'];
const inviteeUserId = process.env['E2E_INVITEE_USER_ID'];
const newRole = process.env['E2E_INVITEE_NEW_ROLE'] ?? 'admin';

async function login(page: import('@playwright/test').Page, email: string, password: string) {
  await page.goto(`${baseURL}/auth/login`);
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole('button', { name: /login|sign in/i }).first().click();
}

test.describe('Workspace invitation lifecycle', () => {
  test('invite member -> accept -> change role -> remove', async ({ browser, page }) => {
    test.skip(
      ownerEmail === undefined ||
        ownerPassword === undefined ||
        inviteeEmail === undefined ||
        inviteePassword === undefined ||
        tenantId === undefined ||
        inviteeUserId === undefined,
      'Set E2E_OWNER_EMAIL/E2E_OWNER_PASSWORD, E2E_INVITEE_EMAIL/E2E_INVITEE_PASSWORD, E2E_TENANT_ID, and E2E_INVITEE_USER_ID.',
    );

    await login(page, ownerEmail ?? '', ownerPassword ?? '');

    const createInvite = await page.evaluate(
      async ({ tenantId: tId, email }) => {
        const response = await fetch(`/api/tenants/${tId}/invitations`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ email, role: 'member' }),
        });
        const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;
        return { status: response.status, body };
      },
      { tenantId: tenantId ?? '', email: inviteeEmail ?? '' },
    );
    expect(createInvite.status).toBe(201);
    const invitationId = String(createInvite.body['id'] ?? '');
    expect(invitationId.length).toBeGreaterThan(0);

    const inviteeContext = await browser.newContext();
    const inviteePage = await inviteeContext.newPage();
    await login(inviteePage, inviteeEmail ?? '', inviteePassword ?? '');
    const acceptInvite = await inviteePage.evaluate(
      async ({ id }) => {
        const response = await fetch(`/api/invitations/${id}/accept`, {
          method: 'POST',
          credentials: 'include',
        });
        return { status: response.status };
      },
      { id: invitationId },
    );
    expect(acceptInvite.status).toBe(200);
    await inviteeContext.close();

    const updateRole = await page.evaluate(
      async ({ tenantId: tId, userId, role }) => {
        const response = await fetch(`/api/tenants/${tId}/members/${userId}/role`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ role }),
        });
        return { status: response.status };
      },
      { tenantId: tenantId ?? '', userId: inviteeUserId ?? '', role: newRole },
    );
    expect(updateRole.status).toBe(200);

    const removeMember = await page.evaluate(
      async ({ tenantId: tId, userId }) => {
        const response = await fetch(`/api/tenants/${tId}/members/${userId}/remove`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          credentials: 'include',
        });
        return { status: response.status };
      },
      { tenantId: tenantId ?? '', userId: inviteeUserId ?? '' },
    );
    expect(removeMember.status).toBe(200);
  });
});
