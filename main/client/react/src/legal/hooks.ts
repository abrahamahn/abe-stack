// main/client/react/src/legal/hooks.ts
/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-return */
/**
 * Legal React Hooks
 *
 * Provides hooks for legal document and user agreement management:
 * - useCurrentLegal: Fetch current ToS + privacy policy versions
 * - useUserAgreements: Fetch the authenticated user's accepted agreements
 * - usePublishLegal: Publish a new legal document version (admin)
 */

import { createLegalClient } from '@bslt/client-engine';
import { useCallback, useMemo } from 'react';

import { useMutation } from '../query/useMutation';
import { useQuery } from '../query/useQuery';

import type {
  LegalClientConfig,
  LegalDocumentItem,
  PublishLegalDocumentRequest,
  PublishLegalDocumentResponse,
  UserAgreementItem,
} from '@bslt/client-engine';

// ============================================================================
// Query Keys
// ============================================================================

export const legalQueryKeys = {
  all: ['legal'] as const,
  currentDocuments: () => [...legalQueryKeys.all, 'current'] as const,
  userAgreements: () => [...legalQueryKeys.all, 'agreements'] as const,
};

// ============================================================================
// Types
// ============================================================================

export interface UseCurrentLegalOptions {
  /** API client configuration */
  clientConfig: LegalClientConfig;
  /** Auto-fetch on mount (default: true) */
  autoFetch?: boolean;
}

export interface CurrentLegalState {
  /** Current legal documents (latest version of each type) */
  documents: LegalDocumentItem[];
  /** Whether documents are being loaded */
  isLoading: boolean;
  /** Error from fetching documents */
  error: Error | null;
  /** Refresh the documents from the server */
  refresh: () => Promise<void>;
}

export interface UseUserAgreementsOptions {
  /** API client configuration */
  clientConfig: LegalClientConfig;
  /** Auto-fetch on mount (default: true) */
  autoFetch?: boolean;
}

export interface UserAgreementsState {
  /** User's accepted agreements */
  agreements: UserAgreementItem[];
  /** Whether agreements are being loaded */
  isLoading: boolean;
  /** Error from fetching agreements */
  error: Error | null;
  /** Refresh the agreements from the server */
  refresh: () => Promise<void>;
}

export interface UsePublishLegalOptions {
  /** API client configuration */
  clientConfig: LegalClientConfig;
}

export interface PublishLegalState {
  /** Publish a new legal document version */
  publish: (data: PublishLegalDocumentRequest) => Promise<PublishLegalDocumentResponse>;
  /** Whether a publish operation is in progress */
  isPublishing: boolean;
  /** Error from the most recent publish attempt */
  error: Error | null;
}

// ============================================================================
// useCurrentLegal
// ============================================================================

/**
 * Fetch current (latest version of each type) legal documents.
 * Public endpoint -- does not require authentication.
 *
 * @param options - Hook options with client config
 * @returns Current legal documents state
 */
export function useCurrentLegal(options: UseCurrentLegalOptions): CurrentLegalState {
  const { clientConfig, autoFetch = true } = options;
  const client = useMemo(() => createLegalClient(clientConfig), [clientConfig]);

  const query = useQuery({
    queryKey: legalQueryKeys.currentDocuments(),
    queryFn: () => client.getCurrentDocuments(),
    enabled: autoFetch,
  });

  return {
    documents: query.data?.documents ?? [],
    isLoading: query.isLoading,
    error: query.error ?? null,
    refresh: query.refetch,
  };
}

// ============================================================================
// useUserAgreements
// ============================================================================

/**
 * Fetch the authenticated user's legal agreements.
 *
 * @param options - Hook options with client config
 * @returns User agreements state
 */
export function useUserAgreements(options: UseUserAgreementsOptions): UserAgreementsState {
  const { clientConfig, autoFetch = true } = options;
  const client = useMemo(() => createLegalClient(clientConfig), [clientConfig]);

  const query = useQuery({
    queryKey: legalQueryKeys.userAgreements(),
    queryFn: () => client.getUserAgreements(),
    enabled: autoFetch,
  });

  return {
    agreements: query.data?.agreements ?? [],
    isLoading: query.isLoading,
    error: query.error ?? null,
    refresh: query.refetch,
  };
}

// ============================================================================
// usePublishLegal
// ============================================================================

/**
 * Publish a new version of a legal document.
 * Admin-only -- requires admin authentication.
 *
 * @param options - Hook options with client config
 * @returns Publish mutation state
 */
export function usePublishLegal(options: UsePublishLegalOptions): PublishLegalState {
  const { clientConfig } = options;
  const client = useMemo(() => createLegalClient(clientConfig), [clientConfig]);

  const mutation = useMutation<PublishLegalDocumentResponse, Error, PublishLegalDocumentRequest>({
    mutationFn: (data: PublishLegalDocumentRequest) => client.publishDocument(data),
    invalidateOnSuccess: [legalQueryKeys.currentDocuments()],
  });

  const handlePublish = useCallback(
    async (data: PublishLegalDocumentRequest): Promise<PublishLegalDocumentResponse> => {
      return mutation.mutateAsync(data);
    },
    [mutation],
  );

  return {
    publish: handlePublish,
    isPublishing: mutation.isPending,
    error: mutation.error ?? null,
  };
}
