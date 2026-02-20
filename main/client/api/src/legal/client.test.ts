// main/client/api/src/legal/client.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createLegalClient } from './client';

import type { LegalClient } from './client';

// ============================================================================
// Helpers
// ============================================================================

function createMockFetch(responseData: unknown, status = 200): typeof fetch {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(responseData),
  });
}

function createClient(fetchImpl: typeof fetch, getToken?: () => string | null): LegalClient {
  return createLegalClient({
    baseUrl: 'http://localhost:3001',
    fetchImpl,
    getToken,
  });
}

// ============================================================================
// Tests
// ============================================================================

describe('LegalClient', () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getCurrentDocuments', () => {
    it('should fetch current legal documents without auth', async () => {
      const responseData = {
        documents: [
          {
            id: 'doc-1',
            type: 'terms_of_service',
            title: 'Terms of Service',
            content: 'Terms...',
            version: 1,
            effectiveAt: '2026-01-01T00:00:00.000Z',
            createdAt: '2026-01-01T00:00:00.000Z',
          },
        ],
      };
      mockFetch = createMockFetch(responseData) as ReturnType<typeof vi.fn>;
      const client = createClient(mockFetch as typeof fetch);

      const result = await client.getCurrentDocuments();

      expect(result.documents).toHaveLength(1);
      expect(result.documents[0]?.type).toBe('terms_of_service');
      // Should not include Authorization header (public endpoint)
      const headers = (mockFetch.mock.calls[0]?.[1] as RequestInit).headers as Headers;
      expect(headers.get('authorization')).toBeNull();
    });
  });

  describe('getUserAgreements', () => {
    it('should fetch user agreements with auth', async () => {
      const responseData = {
        agreements: [
          {
            id: 'cr-1',
            userId: 'user-1',
            documentId: 'doc-1',
            agreedAt: '2026-01-15T10:00:00.000Z',
            ipAddress: '127.0.0.1',
          },
        ],
      };
      mockFetch = createMockFetch(responseData) as ReturnType<typeof vi.fn>;
      const client = createClient(mockFetch as typeof fetch, () => 'test-token');

      const result = await client.getUserAgreements();

      expect(result.agreements).toHaveLength(1);
      expect(result.agreements[0]?.documentId).toBe('doc-1');
      // Should include Authorization header
      const headers = (mockFetch.mock.calls[0]?.[1] as RequestInit).headers as Headers;
      expect(headers.get('authorization')).toBe('Bearer test-token');
    });
  });

  describe('publishDocument', () => {
    it('should publish a legal document with POST', async () => {
      const responseData = {
        document: {
          id: 'doc-2',
          type: 'privacy_policy',
          title: 'Privacy Policy v2',
          content: 'Updated privacy...',
          version: 2,
          effectiveAt: '2026-03-01T00:00:00.000Z',
          createdAt: '2026-02-20T00:00:00.000Z',
        },
      };
      mockFetch = createMockFetch(responseData, 201) as ReturnType<typeof vi.fn>;
      const client = createClient(mockFetch as typeof fetch, () => 'admin-token');

      const result = await client.publishDocument({
        type: 'privacy_policy',
        title: 'Privacy Policy v2',
        content: 'Updated privacy...',
        effectiveAt: '2026-03-01T00:00:00.000Z',
      });

      expect(result.document.type).toBe('privacy_policy');
      expect(result.document.version).toBe(2);
      // Should send POST
      const options = mockFetch.mock.calls[0]?.[1] as RequestInit;
      expect(options.method).toBe('POST');
    });
  });
});
