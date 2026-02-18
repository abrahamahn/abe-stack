// main/shared/src/core/admin/admin.schemas.test.ts

/**
 * @file Admin Schemas Unit Tests
 * @description Tests for admin response schemas: adminTenantSchema, adminTenantsListResponseSchema,
 * impersonationResponseSchema, endImpersonationResponseSchema, systemStatsResponseSchema,
 * and routeManifestResponseSchema.
 * @module Core/Admin/Tests
 */

import { describe, expect, it } from 'vitest';

import {
  adminTenantSchema,
  adminTenantsListResponseSchema,
  endImpersonationResponseSchema,
  impersonationResponseSchema,
  routeManifestResponseSchema,
  systemStatsResponseSchema,
  type AdminTenant,
  type EndImpersonationResponse,
  type ImpersonationResponse,
  type RouteManifestResponse,
  type SystemStatsResponse,
} from './admin.schemas';

// ============================================================================
// Test Constants
// ============================================================================

const VALID_TENANT_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const VALID_OWNER_ID = 'b1ffcd00-ad1c-4ef9-ab7e-7cc0ce491b22';
const VALID_DATETIME = '2026-01-01T00:00:00.000Z';

function createValidAdminTenant(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: VALID_TENANT_ID,
    name: 'Acme Corp',
    slug: 'acme-corp',
    ownerId: VALID_OWNER_ID,
    isActive: true,
    isSuspended: false,
    memberCount: 10,
    createdAt: VALID_DATETIME,
    updatedAt: VALID_DATETIME,
    ...overrides,
  };
}

// ============================================================================
// adminTenantSchema Tests
// ============================================================================

describe('adminTenantSchema', () => {
  describe('when given valid input', () => {
    it('should parse valid admin tenant with all fields', () => {
      const result: AdminTenant = adminTenantSchema.parse(createValidAdminTenant());

      expect(result.id).toBe(VALID_TENANT_ID);
      expect(result.name).toBe('Acme Corp');
      expect(result.slug).toBe('acme-corp');
      expect(result.ownerId).toBe(VALID_OWNER_ID);
      expect(result.isActive).toBe(true);
      expect(result.isSuspended).toBe(false);
      expect(result.memberCount).toBe(10);
      expect(result.createdAt).toBe(VALID_DATETIME);
      expect(result.updatedAt).toBe(VALID_DATETIME);
    });

    it('should parse inactive suspended tenant', () => {
      const result: AdminTenant = adminTenantSchema.parse(
        createValidAdminTenant({ isActive: false, isSuspended: true }),
      );

      expect(result.isActive).toBe(false);
      expect(result.isSuspended).toBe(true);
    });

    it('should parse tenant with zero memberCount', () => {
      const result: AdminTenant = adminTenantSchema.parse(
        createValidAdminTenant({ memberCount: 0 }),
      );

      expect(result.memberCount).toBe(0);
    });

    it('should parse tenant with large memberCount', () => {
      const result: AdminTenant = adminTenantSchema.parse(
        createValidAdminTenant({ memberCount: 9999 }),
      );

      expect(result.memberCount).toBe(9999);
    });
  });

  describe('when given invalid input', () => {
    it('should throw when id is not a valid UUID', () => {
      expect(() => adminTenantSchema.parse(createValidAdminTenant({ id: 'not-a-uuid' }))).toThrow();
    });

    it('should throw when ownerId is not a valid UUID', () => {
      expect(() =>
        adminTenantSchema.parse(createValidAdminTenant({ ownerId: 'not-a-uuid' })),
      ).toThrow();
    });

    it('should throw when name is missing', () => {
      const { name: _n, ...input } = createValidAdminTenant();
      expect(() => adminTenantSchema.parse(input)).toThrow('name must be a string');
    });

    it('should throw when slug is missing', () => {
      const { slug: _s, ...input } = createValidAdminTenant();
      expect(() => adminTenantSchema.parse(input)).toThrow('slug must be a string');
    });

    it('should throw when isActive is not a boolean', () => {
      expect(() => adminTenantSchema.parse(createValidAdminTenant({ isActive: 'yes' }))).toThrow(
        'isActive must be a boolean',
      );
    });

    it('should throw when isSuspended is not a boolean', () => {
      expect(() => adminTenantSchema.parse(createValidAdminTenant({ isSuspended: 1 }))).toThrow(
        'isSuspended must be a boolean',
      );
    });

    it('should throw when memberCount is negative', () => {
      expect(() => adminTenantSchema.parse(createValidAdminTenant({ memberCount: -1 }))).toThrow();
    });

    it('should throw when memberCount is not an integer', () => {
      expect(() => adminTenantSchema.parse(createValidAdminTenant({ memberCount: 5.5 }))).toThrow();
    });

    it('should throw when createdAt is an invalid datetime', () => {
      expect(() =>
        adminTenantSchema.parse(createValidAdminTenant({ createdAt: 'not-a-date' })),
      ).toThrow();
    });

    it('should throw when updatedAt is missing', () => {
      const { updatedAt: _u, ...input } = createValidAdminTenant();
      expect(() => adminTenantSchema.parse(input)).toThrow();
    });
  });

  describe('edge cases', () => {
    it('should throw for null input', () => {
      expect(() => adminTenantSchema.parse(null)).toThrow();
    });

    it('should throw for non-object input', () => {
      expect(() => adminTenantSchema.parse('not-an-object')).toThrow();
    });

    it('should throw for empty object', () => {
      expect(() => adminTenantSchema.parse({})).toThrow();
    });
  });
});

// ============================================================================
// adminTenantsListResponseSchema Tests
// ============================================================================

describe('adminTenantsListResponseSchema', () => {
  const validTenant = createValidAdminTenant();

  it('should parse paginated response with one tenant', () => {
    const result = adminTenantsListResponseSchema.parse({
      data: [validTenant],
      total: 1,
      page: 1,
      limit: 10,
      hasNext: false,
      hasPrev: false,
      totalPages: 1,
    });

    expect(result.data).toHaveLength(1);
    expect(result.total).toBe(1);
  });

  it('should parse paginated response with empty data array', () => {
    const result = adminTenantsListResponseSchema.parse({
      data: [],
      total: 0,
      page: 1,
      limit: 10,
      hasNext: false,
      hasPrev: false,
      totalPages: 0,
    });

    expect(result.data).toHaveLength(0);
    expect(result.total).toBe(0);
  });

  it('should throw when data is not an array', () => {
    expect(() =>
      adminTenantsListResponseSchema.parse({
        data: 'not-array',
        total: 0,
        page: 1,
        limit: 10,
        hasNext: false,
        hasPrev: false,
        totalPages: 0,
      }),
    ).toThrow();
  });

  it('should throw when a tenant in data is invalid', () => {
    expect(() =>
      adminTenantsListResponseSchema.parse({
        data: [{ ...validTenant, id: 'bad-uuid' }],
        total: 1,
        page: 1,
        limit: 10,
        hasNext: false,
        hasPrev: false,
        totalPages: 1,
      }),
    ).toThrow();
  });
});

// ============================================================================
// impersonationResponseSchema Tests
// ============================================================================

describe('impersonationResponseSchema', () => {
  function createValidImpersonation(
    overrides: Record<string, unknown> = {},
  ): Record<string, unknown> {
    return {
      message: 'Impersonation started',
      targetUserId: VALID_OWNER_ID,
      sessionToken: 'tok_abc123xyz',
      ...overrides,
    };
  }

  describe('when given valid input', () => {
    it('should parse valid impersonation response', () => {
      const result: ImpersonationResponse = impersonationResponseSchema.parse(
        createValidImpersonation(),
      );

      expect(result.message).toBe('Impersonation started');
      expect(result.targetUserId).toBe(VALID_OWNER_ID);
      expect(result.sessionToken).toBe('tok_abc123xyz');
    });

    it('should parse response with a different session token format', () => {
      const result: ImpersonationResponse = impersonationResponseSchema.parse(
        createValidImpersonation({ sessionToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9' }),
      );

      expect(result.sessionToken).toBe('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');
    });
  });

  describe('when given invalid input', () => {
    it('should throw when message is missing', () => {
      const { message: _m, ...input } = createValidImpersonation();
      expect(() => impersonationResponseSchema.parse(input)).toThrow('message must be a string');
    });

    it('should throw when targetUserId is missing', () => {
      const { targetUserId: _t, ...input } = createValidImpersonation();
      expect(() => impersonationResponseSchema.parse(input)).toThrow(
        'targetUserId must be a string',
      );
    });

    it('should throw when sessionToken is missing', () => {
      const { sessionToken: _s, ...input } = createValidImpersonation();
      expect(() => impersonationResponseSchema.parse(input)).toThrow(
        'sessionToken must be a string',
      );
    });

    it('should throw when message is null', () => {
      expect(() =>
        impersonationResponseSchema.parse(createValidImpersonation({ message: null })),
      ).toThrow('message must be a string');
    });

    it('should throw when targetUserId is a number', () => {
      expect(() =>
        impersonationResponseSchema.parse(createValidImpersonation({ targetUserId: 42 })),
      ).toThrow('targetUserId must be a string');
    });
  });

  describe('edge cases', () => {
    it('should throw for null input', () => {
      expect(() => impersonationResponseSchema.parse(null)).toThrow();
    });

    it('should throw for empty object', () => {
      expect(() => impersonationResponseSchema.parse({})).toThrow('message must be a string');
    });
  });
});

// ============================================================================
// endImpersonationResponseSchema Tests
// ============================================================================

describe('endImpersonationResponseSchema', () => {
  describe('when given valid input', () => {
    it('should parse valid end impersonation response', () => {
      const result: EndImpersonationResponse = endImpersonationResponseSchema.parse({
        message: 'Impersonation ended',
      });

      expect(result.message).toBe('Impersonation ended');
    });

    it('should parse response with any non-empty message', () => {
      const result: EndImpersonationResponse = endImpersonationResponseSchema.parse({
        message: 'Session restored to original user',
      });

      expect(result.message).toBe('Session restored to original user');
    });
  });

  describe('when given invalid input', () => {
    it('should throw when message is missing', () => {
      expect(() => endImpersonationResponseSchema.parse({})).toThrow('message must be a string');
    });

    it('should throw when message is null', () => {
      expect(() => endImpersonationResponseSchema.parse({ message: null })).toThrow(
        'message must be a string',
      );
    });

    it('should throw when message is a number', () => {
      expect(() => endImpersonationResponseSchema.parse({ message: 123 })).toThrow(
        'message must be a string',
      );
    });
  });

  describe('edge cases', () => {
    it('should throw for null input', () => {
      expect(() => endImpersonationResponseSchema.parse(null)).toThrow();
    });

    it('should accept empty string message', () => {
      const result: EndImpersonationResponse = endImpersonationResponseSchema.parse({
        message: '',
      });

      expect(result.message).toBe('');
    });
  });
});

// ============================================================================
// systemStatsResponseSchema Tests
// ============================================================================

describe('systemStatsResponseSchema', () => {
  function createValidStats(overrides: Record<string, unknown> = {}): Record<string, unknown> {
    return {
      totalUsers: 1500,
      totalTenants: 75,
      activeSubscriptions: 60,
      monthlyRevenue: 12345.67,
      ...overrides,
    };
  }

  describe('when given valid input', () => {
    it('should parse valid system stats response', () => {
      const result: SystemStatsResponse = systemStatsResponseSchema.parse(createValidStats());

      expect(result.totalUsers).toBe(1500);
      expect(result.totalTenants).toBe(75);
      expect(result.activeSubscriptions).toBe(60);
      expect(result.monthlyRevenue).toBe(12345.67);
    });

    it('should parse stats with all zeros', () => {
      const result: SystemStatsResponse = systemStatsResponseSchema.parse(
        createValidStats({
          totalUsers: 0,
          totalTenants: 0,
          activeSubscriptions: 0,
          monthlyRevenue: 0,
        }),
      );

      expect(result.totalUsers).toBe(0);
      expect(result.totalTenants).toBe(0);
      expect(result.activeSubscriptions).toBe(0);
      expect(result.monthlyRevenue).toBe(0);
    });

    it('should parse stats with decimal monthlyRevenue', () => {
      const result: SystemStatsResponse = systemStatsResponseSchema.parse(
        createValidStats({ monthlyRevenue: 99999.99 }),
      );

      expect(result.monthlyRevenue).toBe(99999.99);
    });
  });

  describe('when given invalid input', () => {
    it('should throw when totalUsers is missing', () => {
      const { totalUsers: _tu, ...input } = createValidStats();
      expect(() => systemStatsResponseSchema.parse(input)).toThrow('totalUsers must be a number');
    });

    it('should throw when totalTenants is negative', () => {
      expect(() =>
        systemStatsResponseSchema.parse(createValidStats({ totalTenants: -1 })),
      ).toThrow();
    });

    it('should throw when totalUsers is not an integer', () => {
      expect(() =>
        systemStatsResponseSchema.parse(createValidStats({ totalUsers: 1.5 })),
      ).toThrow();
    });

    it('should throw when activeSubscriptions is a string', () => {
      expect(() =>
        systemStatsResponseSchema.parse(createValidStats({ activeSubscriptions: 'many' })),
      ).toThrow('activeSubscriptions must be a number');
    });

    it('should throw when monthlyRevenue is negative', () => {
      expect(() =>
        systemStatsResponseSchema.parse(createValidStats({ monthlyRevenue: -100 })),
      ).toThrow();
    });

    it('should throw when monthlyRevenue is null', () => {
      expect(() =>
        systemStatsResponseSchema.parse(createValidStats({ monthlyRevenue: null })),
      ).toThrow('monthlyRevenue must be a number');
    });
  });

  describe('edge cases', () => {
    it('should throw for null input', () => {
      expect(() => systemStatsResponseSchema.parse(null)).toThrow();
    });

    it('should throw for empty object', () => {
      expect(() => systemStatsResponseSchema.parse({})).toThrow('totalUsers must be a number');
    });
  });
});

// ============================================================================
// routeManifestResponseSchema Tests
// ============================================================================

describe('routeManifestResponseSchema', () => {
  function createValidManifest(overrides: Record<string, unknown> = {}): Record<string, unknown> {
    return {
      routes: ['/api/v1/users', '/api/v1/tenants', '/api/v1/health'],
      timestamp: VALID_DATETIME,
      ...overrides,
    };
  }

  describe('when given valid input', () => {
    it('should parse valid route manifest response', () => {
      const result: RouteManifestResponse =
        routeManifestResponseSchema.parse(createValidManifest());

      expect(result.routes).toHaveLength(3);
      expect(result.routes[0]).toBe('/api/v1/users');
      expect(result.timestamp).toBe(VALID_DATETIME);
    });

    it('should parse manifest with empty routes array', () => {
      const result: RouteManifestResponse = routeManifestResponseSchema.parse(
        createValidManifest({ routes: [] }),
      );

      expect(result.routes).toHaveLength(0);
    });

    it('should parse manifest with a single route', () => {
      const result: RouteManifestResponse = routeManifestResponseSchema.parse(
        createValidManifest({ routes: ['/api/v1/health'] }),
      );

      expect(result.routes).toEqual(['/api/v1/health']);
    });
  });

  describe('when given invalid input', () => {
    it('should throw when routes is not an array', () => {
      expect(() =>
        routeManifestResponseSchema.parse(createValidManifest({ routes: 'not-array' })),
      ).toThrow('routes must be an array');
    });

    it('should throw when routes is missing', () => {
      const { routes: _r, ...input } = createValidManifest();
      expect(() => routeManifestResponseSchema.parse(input)).toThrow('routes must be an array');
    });

    it('should throw when a route item is not a string', () => {
      expect(() =>
        routeManifestResponseSchema.parse(createValidManifest({ routes: ['/valid', 123] })),
      ).toThrow('routes[] must be a string');
    });

    it('should throw when timestamp is an invalid datetime', () => {
      expect(() =>
        routeManifestResponseSchema.parse(createValidManifest({ timestamp: 'not-a-date' })),
      ).toThrow();
    });

    it('should throw when timestamp is missing', () => {
      const { timestamp: _t, ...input } = createValidManifest();
      expect(() => routeManifestResponseSchema.parse(input)).toThrow();
    });
  });

  describe('edge cases', () => {
    it('should throw for null input', () => {
      expect(() => routeManifestResponseSchema.parse(null)).toThrow('routes must be an array');
    });

    it('should throw for non-object input', () => {
      expect(() => routeManifestResponseSchema.parse('manifest')).toThrow(
        'routes must be an array',
      );
    });
  });
});
