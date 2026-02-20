// main/client/react/src/legal/index.ts
/**
 * Legal React Hooks
 *
 * React hooks for legal document and user agreement management.
 */

export { legalQueryKeys, useCurrentLegal, usePublishLegal, useUserAgreements } from './hooks';
export type {
  CurrentLegalState,
  PublishLegalState,
  UseCurrentLegalOptions,
  UsePublishLegalOptions,
  UseUserAgreementsOptions,
  UserAgreementsState,
} from './hooks';
