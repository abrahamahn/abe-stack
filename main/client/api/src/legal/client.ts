// main/client/api/src/legal/client.ts
/**
 * Legal API Client
 *
 * Framework-agnostic client for legal document and user agreement endpoints.
 * Provides typed methods for:
 * - Public: fetching current legal documents (ToS + Privacy Policy)
 * - User: listing user's accepted agreements
 * - Admin: publishing new legal document versions
 */

import { apiRequest, createRequestFactory } from '../utils';

import type { BaseClientConfig } from '../utils';

// ============================================================================
// Types
// ============================================================================

export type LegalClientConfig = BaseClientConfig;

/** A legal document as returned by the API */
export interface LegalDocumentItem {
  id: string;
  type: string;
  title: string;
  content: string;
  version: number;
  effectiveAt: string;
  createdAt: string;
}

/** A user's agreement to a legal document */
export interface UserAgreementItem {
  id: string;
  userId: string;
  documentId: string;
  agreedAt: string;
  ipAddress: string | null;
}

/** Response from GET /api/legal/current */
export interface CurrentLegalResponse {
  documents: LegalDocumentItem[];
}

/** Response from GET /api/users/me/agreements */
export interface UserAgreementsResponse {
  agreements: UserAgreementItem[];
}

/** Input for POST /api/admin/legal/publish */
export interface PublishLegalDocumentRequest {
  type: string;
  title: string;
  content: string;
  effectiveAt: string;
}

/** Response from POST /api/admin/legal/publish */
export interface PublishLegalDocumentResponse {
  document: LegalDocumentItem;
}

/** Legal API client interface */
export interface LegalClient {
  /** Get current (latest version of each type) legal documents. Public endpoint. */
  getCurrentDocuments(): Promise<CurrentLegalResponse>;
  /** Get the current user's legal agreements. Requires authentication. */
  getUserAgreements(): Promise<UserAgreementsResponse>;
  /** Publish a new version of a legal document. Admin only. */
  publishDocument(data: PublishLegalDocumentRequest): Promise<PublishLegalDocumentResponse>;
}

// ============================================================================
// Client Factory
// ============================================================================

/**
 * Create a legal API client.
 *
 * @param config - Client configuration (baseUrl, getToken, fetchImpl)
 * @returns Legal client instance
 *
 * @example
 * ```ts
 * const client = createLegalClient({
 *   baseUrl: 'http://localhost:3001',
 *   getToken: () => localStorage.getItem('token'),
 * });
 *
 * const { documents } = await client.getCurrentDocuments();
 * const { agreements } = await client.getUserAgreements();
 * ```
 */
export function createLegalClient(config: LegalClientConfig): LegalClient {
  const factory = createRequestFactory(config);

  return {
    getCurrentDocuments: () =>
      apiRequest<CurrentLegalResponse>(factory, '/legal/current', undefined, false),

    getUserAgreements: () =>
      apiRequest<UserAgreementsResponse>(factory, '/users/me/agreements', undefined, true),

    publishDocument: (data: PublishLegalDocumentRequest) =>
      apiRequest<PublishLegalDocumentResponse>(
        factory,
        '/admin/legal/publish',
        {
          method: 'POST',
          body: JSON.stringify(data),
        },
        true,
      ),
  };
}
