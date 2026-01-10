/**
 * Frontend API module
 * All API client functionality in one place
 */

// Legacy export (to be updated by consumers)
export { api } from './client';

// Clients
export { createApiClient } from './api-client';
export type { ApiClient, ApiClientConfig } from './api-client';

export { createReactQueryClient } from './react-query';
export type { CreateApiOptions, ReactQueryClientInstance } from './react-query';

// Utils
export { addAuthHeader } from './utils';
export type { TokenStore } from './utils';

// Re-export types from backend for convenience
export type {
  User,
  UserRole,
  UserResponse,
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  RefreshResponse,
  LogoutResponse,
  ErrorResponse,
} from '../../../backend/api';
