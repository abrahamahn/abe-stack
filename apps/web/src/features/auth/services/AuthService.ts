// apps/web/src/features/auth/services/AuthService.ts
/**
 * AuthService - Manages authentication state and operations.
 *
 * Encapsulates auth logic previously spread across AuthContext.
 * Uses React Query for user state, token store for persistence.
 */

import { tokenStore } from '@abe-stack/core';
import { createApiClient } from '@abe-stack/sdk';

import type {
  AuthResponse,
  EmailVerificationRequest,
  EmailVerificationResponse,
  ForgotPasswordRequest,
  ForgotPasswordResponse,
  LoginRequest,
  RegisterRequest,
  RegisterResponse,
  ResendVerificationRequest,
  ResendVerificationResponse,
  ResetPasswordRequest,
  ResetPasswordResponse,
  UserRole,
} from '@abe-stack/core';
import type { ApiClient } from '@abe-stack/sdk';
import type { ClientConfig } from '@config';
import type { QueryClient } from '@tanstack/react-query';

// ============================================================================
// Types
// ============================================================================

export type User = {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
};

export type AuthState = {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
};

// ============================================================================
// AuthService Class
// ============================================================================

export class AuthService {
  private api: ApiClient;
  private queryClient: QueryClient;
  private config: ClientConfig;
  private refreshIntervalId: ReturnType<typeof setInterval> | null = null;
  private listeners: Set<() => void> = new Set();
  private initialized = false;

  constructor(args: { config: ClientConfig; queryClient: QueryClient }) {
    this.config = args.config;
    this.queryClient = args.queryClient;

    // Create API client for auth operations
    this.api = createApiClient({
      baseUrl: this.config.apiUrl,
      getToken: () => tokenStore.get(),
    });

    // Start refresh interval if we have a token
    if (tokenStore.get()) {
      this.startRefreshInterval();
    }
  }

  /**
   * Initialize auth state on app load.
   *
   * With memory-based token storage (default for security), tokens are cleared
   * on page refresh. This method attempts to restore the session using the
   * refresh token (stored in HTTP-only cookie).
   *
   * Call this once on app startup.
   */
  async initialize(): Promise<User | null> {
    if (this.initialized) {
      return this.getState().user;
    }
    this.initialized = true;

    // If we already have a token in memory, fetch the user
    if (tokenStore.get()) {
      return this.fetchCurrentUser();
    }

    // No token in memory - try to restore session from refresh token cookie
    const refreshed = await this.refreshToken();
    if (refreshed) {
      return this.fetchCurrentUser();
    }

    return null;
  }

  // ==========================================================================
  // State Management
  // ==========================================================================

  /** Get current auth state */
  getState(): AuthState {
    const user = this.queryClient.getQueryData<User>(['auth', 'me']);
    const queryState = this.queryClient.getQueryState(['auth', 'me']);
    const hasToken = Boolean(tokenStore.get());

    return {
      user: user ?? null,
      isLoading: hasToken && queryState?.status === 'pending',
      isAuthenticated: Boolean(user),
    };
  }

  /** Subscribe to auth state changes */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }

  // ==========================================================================
  // Auth Operations
  // ==========================================================================

  /** Login with email/password */
  async login(credentials: LoginRequest): Promise<void> {
    const response: AuthResponse = await this.api.login(credentials);
    this.handleAuthSuccess(response);
  }

  /** Register new account - returns pending status, user must verify email */
  async register(data: RegisterRequest): Promise<RegisterResponse> {
    const response: RegisterResponse = await this.api.register(data);
    // No auto-login - user must verify email first
    return response;
  }

  /** Logout and clear session */
  async logout(): Promise<void> {
    this.stopRefreshInterval();

    // Call server to invalidate refresh token
    try {
      await this.api.logout();
    } catch {
      // Ignore errors - we're logging out anyway
    }

    this.clearAuth();
  }

  /** Refresh access token */
  async refreshToken(): Promise<boolean> {
    try {
      const response = await this.api.refresh();
      tokenStore.set(response.token);
      this.notifyListeners();
      return true;
    } catch {
      // Refresh failed - clear auth state
      this.clearAuth();
      return false;
    }
  }

  /** Fetch current user (call on app load if token exists) */
  async fetchCurrentUser(): Promise<User | null> {
    if (!tokenStore.get()) {
      return null;
    }

    try {
      const user = await this.api.getCurrentUser();
      this.queryClient.setQueryData(['auth', 'me'], user);
      this.notifyListeners();
      return user;
    } catch {
      // Token might be expired, try refresh
      const refreshed = await this.refreshToken();
      if (refreshed) {
        try {
          const user = await this.api.getCurrentUser();
          this.queryClient.setQueryData(['auth', 'me'], user);
          this.notifyListeners();
          return user;
        } catch {
          this.clearAuth();
          return null;
        }
      }
      return null;
    }
  }

  /** Request password reset */
  async forgotPassword(data: ForgotPasswordRequest): Promise<ForgotPasswordResponse> {
    return this.api.forgotPassword(data);
  }

  /** Reset password with token */
  async resetPassword(data: ResetPasswordRequest): Promise<ResetPasswordResponse> {
    return this.api.resetPassword(data);
  }

  /** Verify email with token - auto-logs in user on success */
  async verifyEmail(data: EmailVerificationRequest): Promise<EmailVerificationResponse> {
    const response: EmailVerificationResponse = await this.api.verifyEmail(data);
    // Auto-login on successful verification
    if (response.verified && response.token) {
      this.handleAuthSuccess({ token: response.token, user: response.user });
    }
    return response;
  }

  /** Resend verification email */
  async resendVerification(data: ResendVerificationRequest): Promise<ResendVerificationResponse> {
    return this.api.resendVerification(data);
  }

  // ==========================================================================
  // Private Helpers
  // ==========================================================================

  private handleAuthSuccess(response: AuthResponse): void {
    tokenStore.set(response.token);
    this.queryClient.setQueryData(['auth', 'me'], response.user);
    this.startRefreshInterval();
    this.notifyListeners();
  }

  private clearAuth(): void {
    tokenStore.clear();
    this.queryClient.removeQueries({ queryKey: ['auth', 'me'], exact: true });
    this.notifyListeners();
  }

  private startRefreshInterval(): void {
    this.stopRefreshInterval();
    this.refreshIntervalId = setInterval(() => {
      void this.refreshToken();
    }, this.config.tokenRefreshInterval);
  }

  private stopRefreshInterval(): void {
    if (this.refreshIntervalId) {
      clearInterval(this.refreshIntervalId);
      this.refreshIntervalId = null;
    }
  }

  /** Cleanup on unmount */
  destroy(): void {
    this.stopRefreshInterval();
    this.listeners.clear();
  }
}

// ============================================================================
// Factory
// ============================================================================

export function createAuthService(args: {
  config: ClientConfig;
  queryClient: QueryClient;
}): AuthService {
  return new AuthService(args);
}
