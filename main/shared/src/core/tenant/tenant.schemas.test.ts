// main/shared/src/core/tenant/tenant.schemas.test.ts

/**
 * @file Unit Tests for Tenant Schemas
 * @description Tests for tenant validation schemas and types.
 * @module Core/Tenant/Tests
 */

import { describe, expect, it } from 'vitest';

import {
  createTenantSchema,
  tenantActionResponseSchema,
  tenantListResponseSchema,
  tenantSchema,
  updateTenantSchema,
  type CreateTenantInput,
  type Tenant,
  type TenantActionResponse,
  type TenantListResponse,
  type UpdateTenantInput,
} from './tenant.schemas';

// ============================================================================
// tenantSchema
// ============================================================================

describe('tenantSchema', () => {
  describe('valid inputs', () => {
    it('should parse valid full tenant entity with all fields', () => {
      const input = {
        id: '12345678-1234-4abc-8abc-123456789001',
        name: 'Acme Corporation',
        slug: 'acme-corp',
        logoUrl: 'https://example.com/logo.png',
        ownerId: '12345678-1234-4abc-8abc-123456789002',
        isActive: true,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        metadata: { plan: 'pro', seats: 10 },
      };

      const result: Tenant = tenantSchema.parse(input);

      expect(result).toEqual(input);
    });

    it('should parse with minimal required fields', () => {
      const input = {
        id: '12345678-1234-4abc-8abc-123456789001',
        name: 'Acme',
        slug: 'acme',
        ownerId: '12345678-1234-4abc-8abc-123456789002',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };

      const result: Tenant = tenantSchema.parse(input);

      expect(result.id).toBe('12345678-1234-4abc-8abc-123456789001');
      expect(result.name).toBe('Acme');
      expect(result.slug).toBe('acme');
      expect(result.ownerId).toBe('12345678-1234-4abc-8abc-123456789002');
      expect(result.isActive).toBe(true);
      expect(result.metadata).toEqual({});
    });

    it('should accept null logoUrl', () => {
      const input = {
        id: '12345678-1234-4abc-8abc-123456789001',
        name: 'Acme',
        slug: 'acme',
        logoUrl: null,
        ownerId: '12345678-1234-4abc-8abc-123456789002',
        isActive: true,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        metadata: {},
      };

      const result: Tenant = tenantSchema.parse(input);

      expect(result.logoUrl).toBe(null);
    });

    it('should accept undefined logoUrl', () => {
      const input = {
        id: '12345678-1234-4abc-8abc-123456789001',
        name: 'Acme',
        slug: 'acme',
        ownerId: '12345678-1234-4abc-8abc-123456789002',
        isActive: true,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        metadata: {},
      };

      const result: Tenant = tenantSchema.parse(input);

      expect(result.logoUrl).toBeUndefined();
    });

    it('should accept valid URL for logoUrl', () => {
      const input = {
        id: '12345678-1234-4abc-8abc-123456789001',
        name: 'Acme',
        slug: 'acme',
        logoUrl: 'https://cdn.example.com/logos/acme.svg',
        ownerId: '12345678-1234-4abc-8abc-123456789002',
        isActive: true,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        metadata: {},
      };

      const result: Tenant = tenantSchema.parse(input);

      expect(result.logoUrl).toBe('https://cdn.example.com/logos/acme.svg');
    });
  });

  describe('defaults', () => {
    it('should default isActive to true when undefined', () => {
      const input = {
        id: '12345678-1234-4abc-8abc-123456789001',
        name: 'Acme',
        slug: 'acme',
        ownerId: '12345678-1234-4abc-8abc-123456789002',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };

      const result: Tenant = tenantSchema.parse(input);

      expect(result.isActive).toBe(true);
    });

    it('should default metadata to empty object when undefined', () => {
      const input = {
        id: '12345678-1234-4abc-8abc-123456789001',
        name: 'Acme',
        slug: 'acme',
        ownerId: '12345678-1234-4abc-8abc-123456789002',
        isActive: true,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };

      const result: Tenant = tenantSchema.parse(input);

      expect(result.metadata).toEqual({});
    });

    it('should respect explicitly set isActive to false', () => {
      const input = {
        id: '12345678-1234-4abc-8abc-123456789001',
        name: 'Acme',
        slug: 'acme',
        ownerId: '12345678-1234-4abc-8abc-123456789002',
        isActive: false,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        metadata: {},
      };

      const result: Tenant = tenantSchema.parse(input);

      expect(result.isActive).toBe(false);
    });
  });

  describe('name validation', () => {
    it('should accept name with minimum length of 1', () => {
      const input = {
        id: '12345678-1234-4abc-8abc-123456789001',
        name: 'A',
        slug: 'a',
        ownerId: '12345678-1234-4abc-8abc-123456789002',
        isActive: true,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        metadata: {},
      };

      const result: Tenant = tenantSchema.parse(input);

      expect(result.name).toBe('A');
    });

    it('should accept name with maximum length of 100', () => {
      const name = 'A'.repeat(100);
      const input = {
        id: '12345678-1234-4abc-8abc-123456789001',
        name,
        slug: 'acme',
        ownerId: '12345678-1234-4abc-8abc-123456789002',
        isActive: true,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        metadata: {},
      };

      const result: Tenant = tenantSchema.parse(input);

      expect(result.name).toBe(name);
    });

    it('should reject name longer than 100 characters', () => {
      const input = {
        id: '12345678-1234-4abc-8abc-123456789001',
        name: 'A'.repeat(101),
        slug: 'acme',
        ownerId: '12345678-1234-4abc-8abc-123456789002',
        isActive: true,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        metadata: {},
      };

      expect(() => tenantSchema.parse(input)).toThrow('name must be at most 100 characters');
    });

    it('should reject empty name', () => {
      const input = {
        id: '12345678-1234-4abc-8abc-123456789001',
        name: '',
        slug: 'acme',
        ownerId: '12345678-1234-4abc-8abc-123456789002',
        isActive: true,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        metadata: {},
      };

      expect(() => tenantSchema.parse(input)).toThrow('name must be at least 1 character');
    });

    it('should reject missing name', () => {
      const input = {
        id: '12345678-1234-4abc-8abc-123456789001',
        slug: 'acme',
        ownerId: '12345678-1234-4abc-8abc-123456789002',
        isActive: true,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        metadata: {},
      };

      expect(() => tenantSchema.parse(input)).toThrow();
    });
  });

  describe('slug validation', () => {
    it('should accept valid slugs with lowercase letters', () => {
      const validSlugs = ['acme', 'myworkspace', 'a'];

      for (const slug of validSlugs) {
        const input = {
          id: '12345678-1234-4abc-8abc-123456789001',
          name: 'Acme',
          slug,
          ownerId: '12345678-1234-4abc-8abc-123456789002',
          isActive: true,
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
          metadata: {},
        };

        const result: Tenant = tenantSchema.parse(input);
        expect(result.slug).toBe(slug);
      }
    });

    it('should accept valid slugs with numbers', () => {
      const validSlugs = ['workspace123', 'team1', '123'];

      for (const slug of validSlugs) {
        const input = {
          id: '12345678-1234-4abc-8abc-123456789001',
          name: 'Acme',
          slug,
          ownerId: '12345678-1234-4abc-8abc-123456789002',
          isActive: true,
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
          metadata: {},
        };

        const result: Tenant = tenantSchema.parse(input);
        expect(result.slug).toBe(slug);
      }
    });

    it('should accept valid slugs with hyphens', () => {
      const validSlugs = ['my-workspace', 'acme-corp', 'a-b-c', 'team-1-alpha'];

      for (const slug of validSlugs) {
        const input = {
          id: '12345678-1234-4abc-8abc-123456789001',
          name: 'Acme',
          slug,
          ownerId: '12345678-1234-4abc-8abc-123456789002',
          isActive: true,
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
          metadata: {},
        };

        const result: Tenant = tenantSchema.parse(input);
        expect(result.slug).toBe(slug);
      }
    });

    it('should reject slug with uppercase letters', () => {
      const invalidSlugs = ['MySlug', 'ACME', 'Workspace', 'acme-Corp'];

      for (const slug of invalidSlugs) {
        const input = {
          id: '12345678-1234-4abc-8abc-123456789001',
          name: 'Acme',
          slug,
          ownerId: '12345678-1234-4abc-8abc-123456789002',
          isActive: true,
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
          metadata: {},
        };

        expect(() => tenantSchema.parse(input)).toThrow(
          'slug must contain only lowercase letters, numbers, and hyphens',
        );
      }
    });

    it('should reject slug with spaces', () => {
      const invalidSlugs = ['my slug', 'acme corp', ' acme', 'acme '];

      for (const slug of invalidSlugs) {
        const input = {
          id: '12345678-1234-4abc-8abc-123456789001',
          name: 'Acme',
          slug,
          ownerId: '12345678-1234-4abc-8abc-123456789002',
          isActive: true,
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
          metadata: {},
        };

        expect(() => tenantSchema.parse(input)).toThrow(
          'slug must contain only lowercase letters, numbers, and hyphens',
        );
      }
    });

    it('should reject slug with special characters', () => {
      const invalidSlugs = ['acme@corp', 'my_workspace', 'team.1', 'acme!', 'acme#corp'];

      for (const slug of invalidSlugs) {
        const input = {
          id: '12345678-1234-4abc-8abc-123456789001',
          name: 'Acme',
          slug,
          ownerId: '12345678-1234-4abc-8abc-123456789002',
          isActive: true,
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
          metadata: {},
        };

        expect(() => tenantSchema.parse(input)).toThrow(
          'slug must contain only lowercase letters, numbers, and hyphens',
        );
      }
    });

    it('should reject empty slug', () => {
      const input = {
        id: '12345678-1234-4abc-8abc-123456789001',
        name: 'Acme',
        slug: '',
        ownerId: '12345678-1234-4abc-8abc-123456789002',
        isActive: true,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        metadata: {},
      };

      expect(() => tenantSchema.parse(input)).toThrow('slug must be at least 1 character');
    });

    it('should reject slug longer than 100 characters', () => {
      const input = {
        id: '12345678-1234-4abc-8abc-123456789001',
        name: 'Acme',
        slug: 'a'.repeat(101),
        ownerId: '12345678-1234-4abc-8abc-123456789002',
        isActive: true,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        metadata: {},
      };

      expect(() => tenantSchema.parse(input)).toThrow('slug must be at most 100 characters');
    });

    it('should reject missing slug', () => {
      const input = {
        id: '12345678-1234-4abc-8abc-123456789001',
        name: 'Acme',
        ownerId: '12345678-1234-4abc-8abc-123456789002',
        isActive: true,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        metadata: {},
      };

      expect(() => tenantSchema.parse(input)).toThrow();
    });
  });

  describe('logoUrl validation', () => {
    it('should accept valid HTTPS URL', () => {
      const input = {
        id: '12345678-1234-4abc-8abc-123456789001',
        name: 'Acme',
        slug: 'acme',
        logoUrl: 'https://example.com/logo.png',
        ownerId: '12345678-1234-4abc-8abc-123456789002',
        isActive: true,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        metadata: {},
      };

      const result: Tenant = tenantSchema.parse(input);

      expect(result.logoUrl).toBe('https://example.com/logo.png');
    });

    it('should accept valid HTTP URL', () => {
      const input = {
        id: '12345678-1234-4abc-8abc-123456789001',
        name: 'Acme',
        slug: 'acme',
        logoUrl: 'http://example.com/logo.png',
        ownerId: '12345678-1234-4abc-8abc-123456789002',
        isActive: true,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        metadata: {},
      };

      const result: Tenant = tenantSchema.parse(input);

      expect(result.logoUrl).toBe('http://example.com/logo.png');
    });

    it('should reject invalid URL format', () => {
      const input = {
        id: '12345678-1234-4abc-8abc-123456789001',
        name: 'Acme',
        slug: 'acme',
        logoUrl: 'not-a-url',
        ownerId: '12345678-1234-4abc-8abc-123456789002',
        isActive: true,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        metadata: {},
      };

      expect(() => tenantSchema.parse(input)).toThrow('logoUrl must be a valid URL');
    });

    it('should reject relative URL', () => {
      const input = {
        id: '12345678-1234-4abc-8abc-123456789001',
        name: 'Acme',
        slug: 'acme',
        logoUrl: '/logo.png',
        ownerId: '12345678-1234-4abc-8abc-123456789002',
        isActive: true,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        metadata: {},
      };

      expect(() => tenantSchema.parse(input)).toThrow('logoUrl must be a valid URL');
    });
  });

  describe('ID validation', () => {
    it('should reject invalid UUID for id', () => {
      const input = {
        id: 'not-a-uuid',
        name: 'Acme',
        slug: 'acme',
        ownerId: '12345678-1234-4abc-8abc-123456789002',
        isActive: true,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        metadata: {},
      };

      expect(() => tenantSchema.parse(input)).toThrow();
    });

    it('should reject invalid UUID for ownerId', () => {
      const input = {
        id: '12345678-1234-4abc-8abc-123456789001',
        name: 'Acme',
        slug: 'acme',
        ownerId: 'not-a-uuid',
        isActive: true,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        metadata: {},
      };

      expect(() => tenantSchema.parse(input)).toThrow();
    });

    it('should reject missing id', () => {
      const input = {
        name: 'Acme',
        slug: 'acme',
        ownerId: '12345678-1234-4abc-8abc-123456789002',
        isActive: true,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        metadata: {},
      };

      expect(() => tenantSchema.parse(input)).toThrow();
    });

    it('should reject missing ownerId', () => {
      const input = {
        id: '12345678-1234-4abc-8abc-123456789001',
        name: 'Acme',
        slug: 'acme',
        isActive: true,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        metadata: {},
      };

      expect(() => tenantSchema.parse(input)).toThrow();
    });
  });

  describe('timestamp validation', () => {
    it('should accept valid ISO datetime for createdAt', () => {
      const input = {
        id: '12345678-1234-4abc-8abc-123456789001',
        name: 'Acme',
        slug: 'acme',
        ownerId: '12345678-1234-4abc-8abc-123456789002',
        isActive: true,
        createdAt: '2024-01-01T12:00:00.000Z',
        updatedAt: '2024-01-01T12:00:00.000Z',
        metadata: {},
      };

      const result: Tenant = tenantSchema.parse(input);

      expect(result.createdAt).toBe('2024-01-01T12:00:00.000Z');
    });

    it('should reject invalid datetime for createdAt', () => {
      const input = {
        id: '12345678-1234-4abc-8abc-123456789001',
        name: 'Acme',
        slug: 'acme',
        ownerId: '12345678-1234-4abc-8abc-123456789002',
        isActive: true,
        createdAt: 'invalid-date',
        updatedAt: '2024-01-01T12:00:00.000Z',
        metadata: {},
      };

      expect(() => tenantSchema.parse(input)).toThrow();
    });

    it('should reject invalid date string for createdAt', () => {
      const input = {
        id: '12345678-1234-4abc-8abc-123456789001',
        name: 'Acme',
        slug: 'acme',
        ownerId: '12345678-1234-4abc-8abc-123456789002',
        isActive: true,
        createdAt: 'not-a-date',
        updatedAt: '2024-01-01T12:00:00.000Z',
        metadata: {},
      };

      expect(() => tenantSchema.parse(input)).toThrow();
    });

    it('should reject missing createdAt', () => {
      const input = {
        id: '12345678-1234-4abc-8abc-123456789001',
        name: 'Acme',
        slug: 'acme',
        ownerId: '12345678-1234-4abc-8abc-123456789002',
        isActive: true,
        updatedAt: '2024-01-01T12:00:00.000Z',
        metadata: {},
      };

      expect(() => tenantSchema.parse(input)).toThrow();
    });

    it('should reject missing updatedAt', () => {
      const input = {
        id: '12345678-1234-4abc-8abc-123456789001',
        name: 'Acme',
        slug: 'acme',
        ownerId: '12345678-1234-4abc-8abc-123456789002',
        isActive: true,
        createdAt: '2024-01-01T12:00:00.000Z',
        metadata: {},
      };

      expect(() => tenantSchema.parse(input)).toThrow();
    });
  });

  describe('metadata validation', () => {
    it('should accept valid metadata object', () => {
      const input = {
        id: '12345678-1234-4abc-8abc-123456789001',
        name: 'Acme',
        slug: 'acme',
        ownerId: '12345678-1234-4abc-8abc-123456789002',
        isActive: true,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        metadata: { plan: 'pro', seats: 10, features: ['api', 'webhooks'] },
      };

      const result: Tenant = tenantSchema.parse(input);

      expect(result.metadata).toEqual({ plan: 'pro', seats: 10, features: ['api', 'webhooks'] });
    });

    it('should accept empty metadata object', () => {
      const input = {
        id: '12345678-1234-4abc-8abc-123456789001',
        name: 'Acme',
        slug: 'acme',
        ownerId: '12345678-1234-4abc-8abc-123456789002',
        isActive: true,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        metadata: {},
      };

      const result: Tenant = tenantSchema.parse(input);

      expect(result.metadata).toEqual({});
    });

    it('should reject non-object metadata', () => {
      const input = {
        id: '12345678-1234-4abc-8abc-123456789001',
        name: 'Acme',
        slug: 'acme',
        ownerId: '12345678-1234-4abc-8abc-123456789002',
        isActive: true,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        metadata: 'not-an-object',
      };

      expect(() => tenantSchema.parse(input)).toThrow('metadata must be an object');
    });

    it('should reject array for metadata', () => {
      const input = {
        id: '12345678-1234-4abc-8abc-123456789001',
        name: 'Acme',
        slug: 'acme',
        ownerId: '12345678-1234-4abc-8abc-123456789002',
        isActive: true,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        metadata: ['not', 'an', 'object'],
      };

      expect(() => tenantSchema.parse(input)).toThrow('metadata must be an object');
    });
  });

  describe('edge cases', () => {
    it('should reject non-object input', () => {
      expect(() => tenantSchema.parse(null)).toThrow();
      expect(() => tenantSchema.parse('string')).toThrow();
      expect(() => tenantSchema.parse(123)).toThrow();
    });

    it('should reject array input', () => {
      expect(() => tenantSchema.parse([])).toThrow();
    });
  });
});

// ============================================================================
// createTenantSchema
// ============================================================================

describe('createTenantSchema', () => {
  describe('valid inputs', () => {
    it('should parse with just name', () => {
      const input = {
        name: 'Acme Corporation',
      };

      const result: CreateTenantInput = createTenantSchema.parse(input);

      expect(result.name).toBe('Acme Corporation');
      expect(result.slug).toBeUndefined();
      expect(result.metadata).toBeUndefined();
    });

    it('should parse with name and slug', () => {
      const input = {
        name: 'Acme Corporation',
        slug: 'acme-corp',
      };

      const result: CreateTenantInput = createTenantSchema.parse(input);

      expect(result.name).toBe('Acme Corporation');
      expect(result.slug).toBe('acme-corp');
      expect(result.metadata).toBeUndefined();
    });

    it('should parse with all fields', () => {
      const input = {
        name: 'Acme Corporation',
        slug: 'acme-corp',
        metadata: { plan: 'trial', industry: 'tech' },
      };

      const result: CreateTenantInput = createTenantSchema.parse(input);

      expect(result.name).toBe('Acme Corporation');
      expect(result.slug).toBe('acme-corp');
      expect(result.metadata).toEqual({ plan: 'trial', industry: 'tech' });
    });

    it('should accept name with minimum length of 1', () => {
      const input = {
        name: 'A',
      };

      const result: CreateTenantInput = createTenantSchema.parse(input);

      expect(result.name).toBe('A');
    });

    it('should accept name with maximum length of 100', () => {
      const input = {
        name: 'A'.repeat(100),
      };

      const result: CreateTenantInput = createTenantSchema.parse(input);

      expect(result.name).toBe('A'.repeat(100));
    });
  });

  describe('name validation', () => {
    it('should reject empty name', () => {
      const input = {
        name: '',
      };

      expect(() => createTenantSchema.parse(input)).toThrow('name must be at least 1 character');
    });

    it('should reject name longer than 100 characters', () => {
      const input = {
        name: 'A'.repeat(101),
      };

      expect(() => createTenantSchema.parse(input)).toThrow('name must be at most 100 characters');
    });

    it('should reject missing name', () => {
      const input = {
        slug: 'acme',
      };

      expect(() => createTenantSchema.parse(input)).toThrow();
    });
  });

  describe('slug validation', () => {
    it('should accept valid slug with lowercase letters', () => {
      const input = {
        name: 'Acme',
        slug: 'acme',
      };

      const result: CreateTenantInput = createTenantSchema.parse(input);

      expect(result.slug).toBe('acme');
    });

    it('should accept valid slug with numbers', () => {
      const input = {
        name: 'Acme',
        slug: 'workspace123',
      };

      const result: CreateTenantInput = createTenantSchema.parse(input);

      expect(result.slug).toBe('workspace123');
    });

    it('should accept valid slug with hyphens', () => {
      const input = {
        name: 'Acme',
        slug: 'my-workspace',
      };

      const result: CreateTenantInput = createTenantSchema.parse(input);

      expect(result.slug).toBe('my-workspace');
    });

    it('should reject slug with uppercase letters', () => {
      const input = {
        name: 'Acme',
        slug: 'MyWorkspace',
      };

      expect(() => createTenantSchema.parse(input)).toThrow(
        'slug must contain only lowercase letters, numbers, and hyphens',
      );
    });

    it('should reject slug with spaces', () => {
      const input = {
        name: 'Acme',
        slug: 'my workspace',
      };

      expect(() => createTenantSchema.parse(input)).toThrow(
        'slug must contain only lowercase letters, numbers, and hyphens',
      );
    });

    it('should reject slug with special characters', () => {
      const input = {
        name: 'Acme',
        slug: 'my_workspace',
      };

      expect(() => createTenantSchema.parse(input)).toThrow(
        'slug must contain only lowercase letters, numbers, and hyphens',
      );
    });

    it('should reject empty slug if provided', () => {
      const input = {
        name: 'Acme',
        slug: '',
      };

      expect(() => createTenantSchema.parse(input)).toThrow('slug must be at least 1 character');
    });

    it('should reject slug longer than 100 characters', () => {
      const input = {
        name: 'Acme',
        slug: 'a'.repeat(101),
      };

      expect(() => createTenantSchema.parse(input)).toThrow('slug must be at most 100 characters');
    });
  });

  describe('metadata validation', () => {
    it('should accept valid metadata object', () => {
      const input = {
        name: 'Acme',
        metadata: { plan: 'trial', seats: 5 },
      };

      const result: CreateTenantInput = createTenantSchema.parse(input);

      expect(result.metadata).toEqual({ plan: 'trial', seats: 5 });
    });

    it('should accept empty metadata object', () => {
      const input = {
        name: 'Acme',
        metadata: {},
      };

      const result: CreateTenantInput = createTenantSchema.parse(input);

      expect(result.metadata).toEqual({});
    });

    it('should reject non-object metadata', () => {
      const input = {
        name: 'Acme',
        metadata: 'not-an-object',
      };

      expect(() => createTenantSchema.parse(input)).toThrow('metadata must be an object');
    });

    it('should reject array for metadata', () => {
      const input = {
        name: 'Acme',
        metadata: ['not', 'an', 'object'],
      };

      expect(() => createTenantSchema.parse(input)).toThrow('metadata must be an object');
    });
  });

  describe('optional fields', () => {
    it('should accept undefined slug', () => {
      const input = {
        name: 'Acme',
      };

      const result: CreateTenantInput = createTenantSchema.parse(input);

      expect(result.slug).toBeUndefined();
    });

    it('should accept undefined metadata', () => {
      const input = {
        name: 'Acme',
      };

      const result: CreateTenantInput = createTenantSchema.parse(input);

      expect(result.metadata).toBeUndefined();
    });
  });

  describe('edge cases', () => {
    it('should reject non-object input', () => {
      expect(() => createTenantSchema.parse(null)).toThrow();
      expect(() => createTenantSchema.parse('string')).toThrow();
      expect(() => createTenantSchema.parse(123)).toThrow();
    });

    it('should reject array input', () => {
      expect(() => createTenantSchema.parse([])).toThrow();
    });
  });
});

// ============================================================================
// updateTenantSchema
// ============================================================================

describe('updateTenantSchema', () => {
  describe('valid inputs', () => {
    it('should accept empty update (all fields undefined)', () => {
      const input = {};

      const result: UpdateTenantInput = updateTenantSchema.parse(input);

      expect(result.name).toBeUndefined();
      expect(result.logoUrl).toBeUndefined();
      expect(result.metadata).toBeUndefined();
    });

    it('should accept partial update with name only', () => {
      const input = {
        name: 'Updated Name',
      };

      const result: UpdateTenantInput = updateTenantSchema.parse(input);

      expect(result.name).toBe('Updated Name');
      expect(result.logoUrl).toBeUndefined();
      expect(result.metadata).toBeUndefined();
    });

    it('should accept partial update with logoUrl only', () => {
      const input = {
        logoUrl: 'https://example.com/new-logo.png',
      };

      const result: UpdateTenantInput = updateTenantSchema.parse(input);

      expect(result.name).toBeUndefined();
      expect(result.logoUrl).toBe('https://example.com/new-logo.png');
      expect(result.metadata).toBeUndefined();
    });

    it('should accept partial update with metadata only', () => {
      const input = {
        metadata: { plan: 'pro', seats: 20 },
      };

      const result: UpdateTenantInput = updateTenantSchema.parse(input);

      expect(result.name).toBeUndefined();
      expect(result.logoUrl).toBeUndefined();
      expect(result.metadata).toEqual({ plan: 'pro', seats: 20 });
    });

    it('should accept update with all fields', () => {
      const input = {
        name: 'Updated Name',
        logoUrl: 'https://example.com/new-logo.png',
        metadata: { plan: 'enterprise' },
      };

      const result: UpdateTenantInput = updateTenantSchema.parse(input);

      expect(result.name).toBe('Updated Name');
      expect(result.logoUrl).toBe('https://example.com/new-logo.png');
      expect(result.metadata).toEqual({ plan: 'enterprise' });
    });
  });

  describe('logoUrl nullable handling', () => {
    it('should accept null logoUrl (clear logo)', () => {
      const input = {
        logoUrl: null,
      };

      const result: UpdateTenantInput = updateTenantSchema.parse(input);

      expect(result.logoUrl).toBe(null);
    });

    it('should accept undefined logoUrl (no change)', () => {
      const input = {
        name: 'Updated Name',
      };

      const result: UpdateTenantInput = updateTenantSchema.parse(input);

      expect(result.logoUrl).toBeUndefined();
    });

    it('should accept valid URL for logoUrl', () => {
      const input = {
        logoUrl: 'https://cdn.example.com/logo.svg',
      };

      const result: UpdateTenantInput = updateTenantSchema.parse(input);

      expect(result.logoUrl).toBe('https://cdn.example.com/logo.svg');
    });

    it('should reject invalid URL for logoUrl', () => {
      const input = {
        logoUrl: 'not-a-url',
      };

      expect(() => updateTenantSchema.parse(input)).toThrow('logoUrl must be a valid URL');
    });

    it('should reject relative URL for logoUrl', () => {
      const input = {
        logoUrl: '/logo.png',
      };

      expect(() => updateTenantSchema.parse(input)).toThrow('logoUrl must be a valid URL');
    });
  });

  describe('name validation', () => {
    it('should accept name with minimum length of 1', () => {
      const input = {
        name: 'A',
      };

      const result: UpdateTenantInput = updateTenantSchema.parse(input);

      expect(result.name).toBe('A');
    });

    it('should accept name with maximum length of 100', () => {
      const input = {
        name: 'A'.repeat(100),
      };

      const result: UpdateTenantInput = updateTenantSchema.parse(input);

      expect(result.name).toBe('A'.repeat(100));
    });

    it('should reject empty name', () => {
      const input = {
        name: '',
      };

      expect(() => updateTenantSchema.parse(input)).toThrow('name must be at least 1 character');
    });

    it('should reject name longer than 100 characters', () => {
      const input = {
        name: 'A'.repeat(101),
      };

      expect(() => updateTenantSchema.parse(input)).toThrow('name must be at most 100 characters');
    });
  });

  describe('metadata validation', () => {
    it('should accept valid metadata object', () => {
      const input = {
        metadata: { plan: 'pro', customField: 'value' },
      };

      const result: UpdateTenantInput = updateTenantSchema.parse(input);

      expect(result.metadata).toEqual({ plan: 'pro', customField: 'value' });
    });

    it('should accept empty metadata object', () => {
      const input = {
        metadata: {},
      };

      const result: UpdateTenantInput = updateTenantSchema.parse(input);

      expect(result.metadata).toEqual({});
    });

    it('should reject non-object metadata', () => {
      const input = {
        metadata: 'not-an-object',
      };

      expect(() => updateTenantSchema.parse(input)).toThrow('metadata must be an object');
    });

    it('should reject array for metadata', () => {
      const input = {
        metadata: ['not', 'an', 'object'],
      };

      expect(() => updateTenantSchema.parse(input)).toThrow('metadata must be an object');
    });
  });

  describe('optional fields', () => {
    it('should accept undefined name', () => {
      const input = {
        logoUrl: 'https://example.com/logo.png',
      };

      const result: UpdateTenantInput = updateTenantSchema.parse(input);

      expect(result.name).toBeUndefined();
    });

    it('should accept undefined logoUrl', () => {
      const input = {
        name: 'Updated Name',
      };

      const result: UpdateTenantInput = updateTenantSchema.parse(input);

      expect(result.logoUrl).toBeUndefined();
    });

    it('should accept undefined metadata', () => {
      const input = {
        name: 'Updated Name',
      };

      const result: UpdateTenantInput = updateTenantSchema.parse(input);

      expect(result.metadata).toBeUndefined();
    });
  });

  describe('edge cases', () => {
    it('should accept non-object input and coerce to empty object', () => {
      const result1: UpdateTenantInput = updateTenantSchema.parse(null);
      expect(result1).toEqual({});

      const result2: UpdateTenantInput = updateTenantSchema.parse(undefined);
      expect(result2).toEqual({});
    });

    it('should treat primitives as empty objects (all fields optional)', () => {
      const result1: UpdateTenantInput = updateTenantSchema.parse('string');
      expect(result1.name).toBeUndefined();
      expect(result1.logoUrl).toBeUndefined();
      expect(result1.metadata).toBeUndefined();

      const result2: UpdateTenantInput = updateTenantSchema.parse(123);
      expect(result2.name).toBeUndefined();
      expect(result2.logoUrl).toBeUndefined();
      expect(result2.metadata).toBeUndefined();
    });

    it('should treat arrays as empty objects (all fields optional)', () => {
      const result: UpdateTenantInput = updateTenantSchema.parse([]);
      expect(result.name).toBeUndefined();
      expect(result.logoUrl).toBeUndefined();
      expect(result.metadata).toBeUndefined();
    });
  });
});

// ============================================================================
// tenantListResponseSchema
// ============================================================================

const VALID_TENANT = {
  id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  name: 'Acme Corp',
  slug: 'acme-corp',
  ownerId: 'b1ffcd00-ad1c-4ef9-ab7e-7cc0ce491b22',
  isActive: true,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
  metadata: {},
};

describe('tenantListResponseSchema', () => {
  describe('valid inputs', () => {
    it('should parse response with one tenant', () => {
      const input = { data: [VALID_TENANT] };
      const result: TenantListResponse = tenantListResponseSchema.parse(input);

      expect(result.data).toHaveLength(1);
      expect(result.data[0]?.id).toBe('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');
      expect(result.data[0]?.name).toBe('Acme Corp');
    });

    it('should parse response with empty data array', () => {
      const input = { data: [] };
      const result: TenantListResponse = tenantListResponseSchema.parse(input);

      expect(result.data).toHaveLength(0);
    });

    it('should parse response with multiple tenants', () => {
      const secondTenant = {
        ...VALID_TENANT,
        id: 'c2aadd11-be2d-4ef0-ac8f-8dd1df602c33',
        name: 'Beta Inc',
        slug: 'beta-inc',
      };
      const result: TenantListResponse = tenantListResponseSchema.parse({
        data: [VALID_TENANT, secondTenant],
      });

      expect(result.data).toHaveLength(2);
      expect(result.data[1]?.name).toBe('Beta Inc');
    });
  });

  describe('invalid inputs', () => {
    it('should throw when data is not an array', () => {
      expect(() => tenantListResponseSchema.parse({ data: 'not-array' })).toThrow(
        'data must be an array',
      );
    });

    it('should throw when data is missing', () => {
      expect(() => tenantListResponseSchema.parse({})).toThrow('data must be an array');
    });

    it('should throw when a tenant in data is invalid', () => {
      const badTenant = { ...VALID_TENANT, id: 'bad-uuid' };
      expect(() => tenantListResponseSchema.parse({ data: [badTenant] })).toThrow();
    });

    it('should throw when data is null', () => {
      expect(() => tenantListResponseSchema.parse({ data: null })).toThrow('data must be an array');
    });
  });

  describe('edge cases', () => {
    it('should throw for null input', () => {
      expect(() => tenantListResponseSchema.parse(null)).toThrow('data must be an array');
    });

    it('should throw for non-object input', () => {
      expect(() => tenantListResponseSchema.parse('response')).toThrow('data must be an array');
    });
  });
});

// ============================================================================
// tenantActionResponseSchema
// ============================================================================

describe('tenantActionResponseSchema', () => {
  describe('valid inputs', () => {
    it('should parse valid action response with tenant', () => {
      const input = {
        message: 'Tenant updated successfully',
        tenant: VALID_TENANT,
      };
      const result: TenantActionResponse = tenantActionResponseSchema.parse(input);

      expect(result.message).toBe('Tenant updated successfully');
      expect(result.tenant.id).toBe('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');
      expect(result.tenant.name).toBe('Acme Corp');
    });

    it('should parse action response with minimal tenant', () => {
      const result: TenantActionResponse = tenantActionResponseSchema.parse({
        message: 'Created',
        tenant: VALID_TENANT,
      });

      expect(result.message).toBe('Created');
      expect(result.tenant.slug).toBe('acme-corp');
    });
  });

  describe('invalid inputs', () => {
    it('should throw when message is missing', () => {
      expect(() => tenantActionResponseSchema.parse({ tenant: VALID_TENANT })).toThrow(
        'message must be a string',
      );
    });

    it('should throw when tenant is missing', () => {
      expect(() => tenantActionResponseSchema.parse({ message: 'OK' })).toThrow();
    });

    it('should throw when tenant has invalid data', () => {
      const badTenant = { ...VALID_TENANT, slug: 'Invalid Slug!' };
      expect(() =>
        tenantActionResponseSchema.parse({ message: 'OK', tenant: badTenant }),
      ).toThrow();
    });

    it('should throw when message is null', () => {
      expect(() =>
        tenantActionResponseSchema.parse({ message: null, tenant: VALID_TENANT }),
      ).toThrow('message must be a string');
    });
  });

  describe('edge cases', () => {
    it('should throw for null input', () => {
      expect(() => tenantActionResponseSchema.parse(null)).toThrow();
    });

    it('should throw for empty object', () => {
      expect(() => tenantActionResponseSchema.parse({})).toThrow('message must be a string');
    });
  });
});
