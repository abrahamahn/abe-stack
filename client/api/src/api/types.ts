// client/src/api/types.ts
// Re-export types from shared
export type {
    AuthResponse,
    EmailVerificationRequest,
    EmailVerificationResponse,
    ForgotPasswordRequest,
    ForgotPasswordResponse,
    LoginRequest,
    OAuthConnectionsResponse,
    OAuthEnabledProvidersResponse,
    OAuthProvider,
    OAuthUnlinkResponse,
    RegisterRequest,
    RegisterResponse,
    ResendVerificationRequest,
    ResendVerificationResponse,
    ResetPasswordRequest,
    ResetPasswordResponse,
    User
} from '@abe-stack/shared';

export interface ApiClientOptions {
  baseUrl?: string; // host origin, no /api suffix
  fetchImpl?: typeof fetch;
}
