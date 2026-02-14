// main/server/core/src/tenants/handlers/audit.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { handleListTenantAuditEvents } from './audit';

import type { AuditEvent, AuditEventRepository, DbClient, Repositories } from '../../../../db/src';
import type { TenantsModuleDeps, TenantsRequest } from '../types';

// ============================================================================
// Test Helpers
// ============================================================================

function createMockAuditEventsRepo(): AuditEventRepository {
  return {
    create: vi.fn(),
    findById: vi.fn(),
    findRecent: vi.fn(),
    findByActorId: vi.fn(),
    findByTenantId: vi.fn(),
    findByAction: vi.fn(),
    findByResource: vi.fn(),
    deleteOlderThan: vi.fn(),
  };
}

function createMockDeps(): TenantsModuleDeps {
  return {
    db: {} as DbClient,
    repos: {
      auditEvents: createMockAuditEventsRepo(),
    } as unknown as Repositories,
    log: {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      child: vi.fn(),
    },
  } as unknown as TenantsModuleDeps;
}

function createMockRequest(user?: { userId: string }): TenantsRequest {
  return {
    user,
    requestInfo: { ipAddress: '127.0.0.1', userAgent: 'test' },
    cookies: {},
    headers: {},
  } as TenantsRequest;
}

function createMockAuditEvent(overrides?: Partial<AuditEvent>): AuditEvent {
  return {
    id: 'evt-1',
    action: 'workspace.member_added',
    actorId: 'user-1',
    tenantId: 'tenant-1',
    category: 'admin',
    severity: 'info',
    resource: 'membership',
    resourceId: 'user-2',
    metadata: {},
    ipAddress: '127.0.0.1',
    userAgent: 'test',
    createdAt: new Date('2026-01-15T10:00:00Z'),
    ...overrides,
  };
}

// ============================================================================
// handleListTenantAuditEvents
// ============================================================================

describe('handleListTenantAuditEvents', () => {
  let deps: TenantsModuleDeps;

  beforeEach(() => {
    vi.clearAllMocks();
    deps = createMockDeps();
  });

  it('should return 401 when no user', async () => {
    const request = createMockRequest();

    const result = await handleListTenantAuditEvents(deps, 'tenant-1', {}, request);

    expect(result.status).toBe(401);
    expect(result.body).toEqual({ message: 'Unauthorized' });
  });

  it('should return 200 with events from findByTenantId', async () => {
    const events = [createMockAuditEvent()];
    vi.mocked(deps.repos.auditEvents.findByTenantId).mockResolvedValue(events);
    const request = createMockRequest({ userId: 'user-1' });

    const result = await handleListTenantAuditEvents(deps, 'tenant-1', {}, request);

    expect(result.status).toBe(200);
    expect(result.body).toEqual({ events });
    expect(deps.repos.auditEvents.findByTenantId).toHaveBeenCalledWith('tenant-1', 50);
  });

  it('should filter by action and tenant', async () => {
    const events = [
      createMockAuditEvent({ tenantId: 'tenant-1' }),
      createMockAuditEvent({ id: 'evt-2', tenantId: 'tenant-2' }),
    ];
    vi.mocked(deps.repos.auditEvents.findByAction).mockResolvedValue(events);
    const request = createMockRequest({ userId: 'user-1' });

    const result = await handleListTenantAuditEvents(
      deps,
      'tenant-1',
      { action: 'workspace.member_added' },
      request,
    );

    expect(result.status).toBe(200);
    const body = result.body as { events: AuditEvent[] };
    expect(body.events).toHaveLength(1);
    expect(body.events.at(0)?.tenantId).toBe('tenant-1');
    expect(deps.repos.auditEvents.findByAction).toHaveBeenCalledWith('workspace.member_added', 50);
  });

  it('should filter by actorId and tenant', async () => {
    const events = [
      createMockAuditEvent({ tenantId: 'tenant-1', actorId: 'actor-1' }),
      createMockAuditEvent({ id: 'evt-2', tenantId: 'tenant-2', actorId: 'actor-1' }),
    ];
    vi.mocked(deps.repos.auditEvents.findByActorId).mockResolvedValue(events);
    const request = createMockRequest({ userId: 'user-1' });

    const result = await handleListTenantAuditEvents(
      deps,
      'tenant-1',
      { actorId: 'actor-1' },
      request,
    );

    expect(result.status).toBe(200);
    const body = result.body as { events: AuditEvent[] };
    expect(body.events).toHaveLength(1);
    expect(body.events.at(0)?.tenantId).toBe('tenant-1');
    expect(deps.repos.auditEvents.findByActorId).toHaveBeenCalledWith('actor-1', 50);
  });

  it('should use default limit of 50', async () => {
    vi.mocked(deps.repos.auditEvents.findByTenantId).mockResolvedValue([]);
    const request = createMockRequest({ userId: 'user-1' });

    await handleListTenantAuditEvents(deps, 'tenant-1', {}, request);

    expect(deps.repos.auditEvents.findByTenantId).toHaveBeenCalledWith('tenant-1', 50);
  });

  it('should use custom limit from query', async () => {
    vi.mocked(deps.repos.auditEvents.findByTenantId).mockResolvedValue([]);
    const request = createMockRequest({ userId: 'user-1' });

    await handleListTenantAuditEvents(deps, 'tenant-1', { limit: '25' }, request);

    expect(deps.repos.auditEvents.findByTenantId).toHaveBeenCalledWith('tenant-1', 25);
  });

  it('should cap limit at 200', async () => {
    vi.mocked(deps.repos.auditEvents.findByTenantId).mockResolvedValue([]);
    const request = createMockRequest({ userId: 'user-1' });

    await handleListTenantAuditEvents(deps, 'tenant-1', { limit: '999' }, request);

    expect(deps.repos.auditEvents.findByTenantId).toHaveBeenCalledWith('tenant-1', 200);
  });

  it('should fall back to 50 for non-numeric limit', async () => {
    vi.mocked(deps.repos.auditEvents.findByTenantId).mockResolvedValue([]);
    const request = createMockRequest({ userId: 'user-1' });

    await handleListTenantAuditEvents(deps, 'tenant-1', { limit: 'abc' }, request);

    expect(deps.repos.auditEvents.findByTenantId).toHaveBeenCalledWith('tenant-1', 50);
  });

  it('should filter by startDate', async () => {
    const events = [
      createMockAuditEvent({ createdAt: new Date('2026-01-10T10:00:00Z') }),
      createMockAuditEvent({ id: 'evt-2', createdAt: new Date('2026-01-20T10:00:00Z') }),
    ];
    vi.mocked(deps.repos.auditEvents.findByTenantId).mockResolvedValue(events);
    const request = createMockRequest({ userId: 'user-1' });

    const result = await handleListTenantAuditEvents(
      deps,
      'tenant-1',
      { startDate: '2026-01-15T00:00:00Z' },
      request,
    );

    expect(result.status).toBe(200);
    const body = result.body as { events: AuditEvent[] };
    expect(body.events).toHaveLength(1);
    expect(body.events.at(0)?.id).toBe('evt-2');
  });

  it('should filter by endDate', async () => {
    const events = [
      createMockAuditEvent({ createdAt: new Date('2026-01-10T10:00:00Z') }),
      createMockAuditEvent({ id: 'evt-2', createdAt: new Date('2026-01-20T10:00:00Z') }),
    ];
    vi.mocked(deps.repos.auditEvents.findByTenantId).mockResolvedValue(events);
    const request = createMockRequest({ userId: 'user-1' });

    const result = await handleListTenantAuditEvents(
      deps,
      'tenant-1',
      { endDate: '2026-01-15T00:00:00Z' },
      request,
    );

    expect(result.status).toBe(200);
    const body = result.body as { events: AuditEvent[] };
    expect(body.events).toHaveLength(1);
    expect(body.events.at(0)?.id).toBe('evt-1');
  });

  it('should ignore invalid date strings', async () => {
    const events = [createMockAuditEvent()];
    vi.mocked(deps.repos.auditEvents.findByTenantId).mockResolvedValue(events);
    const request = createMockRequest({ userId: 'user-1' });

    const result = await handleListTenantAuditEvents(
      deps,
      'tenant-1',
      { startDate: 'not-a-date', endDate: 'also-not-a-date' },
      request,
    );

    expect(result.status).toBe(200);
    const body = result.body as { events: AuditEvent[] };
    expect(body.events).toHaveLength(1);
  });

  it('should log the query on success', async () => {
    vi.mocked(deps.repos.auditEvents.findByTenantId).mockResolvedValue([]);
    const request = createMockRequest({ userId: 'user-1' });

    await handleListTenantAuditEvents(deps, 'tenant-1', {}, request);

    expect(deps.log.info).toHaveBeenCalledWith(
      { tenantId: 'tenant-1', userId: 'user-1', resultCount: 0 },
      'Listed tenant audit events',
    );
  });

  it('should map service errors via mapErrorToHttpResponse', async () => {
    vi.mocked(deps.repos.auditEvents.findByTenantId).mockRejectedValue(new Error('DB failure'));
    const request = createMockRequest({ userId: 'user-1' });

    const result = await handleListTenantAuditEvents(deps, 'tenant-1', {}, request);

    expect(result.status).toBe(500);
    expect(deps.log.error).toHaveBeenCalled();
  });
});
