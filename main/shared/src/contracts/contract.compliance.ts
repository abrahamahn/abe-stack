// main/shared/src/contracts/contract.compliance.ts
/**
 * Compliance/GDPR Contracts
 *
 * API contract definitions for legal documents, consent management,
 * data export requests, and account deletion.
 * @module Contracts/Compliance
 */

import {
  complianceActionResponseSchema,
  consentPreferencesResponseSchema,
  dataExportRequestedResponseSchema,
  dataExportRequestSchema,
  legalDocumentSchema,
  updateConsentPreferencesRequestSchema,
} from '../core/compliance/compliance.schemas';
import { emptyBodySchema, errorResponseSchema, successResponseSchema } from '../engine/http';

import type { Contract } from '../primitives/api';

// ============================================================================
// Contract Definition
// ============================================================================

export const complianceContract = {
  getDocument: {
    method: 'GET' as const,
    path: '/api/compliance/documents/:type',
    responses: {
      200: successResponseSchema(legalDocumentSchema),
      404: errorResponseSchema,
    },
    summary: 'Get the current legal document by type (terms, privacy, etc.)',
  },

  getConsentPreferences: {
    method: 'GET' as const,
    path: '/api/compliance/consent',
    responses: {
      200: successResponseSchema(consentPreferencesResponseSchema),
      401: errorResponseSchema,
    },
    summary: 'Get current user consent preferences',
  },

  updateConsentPreferences: {
    method: 'POST' as const,
    path: '/api/compliance/consent',
    body: updateConsentPreferencesRequestSchema,
    responses: {
      200: successResponseSchema(consentPreferencesResponseSchema),
      400: errorResponseSchema,
      401: errorResponseSchema,
    },
    summary: 'Update user consent preferences',
  },

  requestDataExport: {
    method: 'POST' as const,
    path: '/api/compliance/data-export',
    body: emptyBodySchema,
    responses: {
      202: successResponseSchema(dataExportRequestedResponseSchema),
      401: errorResponseSchema,
      429: errorResponseSchema,
    },
    summary: 'Request a GDPR data export',
  },

  getDataExportStatus: {
    method: 'GET' as const,
    path: '/api/compliance/data-export/:requestId',
    responses: {
      200: successResponseSchema(dataExportRequestSchema),
      401: errorResponseSchema,
      404: errorResponseSchema,
    },
    summary: 'Check data export request status',
  },

  requestAccountDeletion: {
    method: 'POST' as const,
    path: '/api/compliance/account-deletion',
    body: emptyBodySchema,
    responses: {
      202: successResponseSchema(complianceActionResponseSchema),
      401: errorResponseSchema,
      409: errorResponseSchema,
    },
    summary: 'Request GDPR account deletion (with grace period)',
  },

  cancelAccountDeletion: {
    method: 'POST' as const,
    path: '/api/compliance/account-deletion/cancel',
    body: emptyBodySchema,
    responses: {
      200: successResponseSchema(complianceActionResponseSchema),
      401: errorResponseSchema,
      404: errorResponseSchema,
    },
    summary: 'Cancel a pending account deletion request',
  },
} satisfies Contract;
