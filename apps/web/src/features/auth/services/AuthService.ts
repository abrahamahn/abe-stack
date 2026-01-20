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
import type { TokenStore } from '@abe-stack/core';
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
  createdAt: string;
};

export type AuthState = {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
};

// ============================================================================
// AuthService Class
// ============================================================================

// Maximum backoff delay for token refresh (5 minutes)
const MAX_REFRESH_BACKOFF_MS = 5 * 60 * 1000;

export class AuthService {
  private api: ApiClient;
  private queryClient: QueryClient;
  private config: ClientConfig;
  private tokenStore: TokenStore;
  private refreshIntervalId: ReturnType<typeof setTimeout> | null = null;
  private listeners: Set<() => void> = new Set();
  private initialized = false;
  private refreshBackoffMs = 0;
  private consecutiveRefreshFailures = 0;
  private refreshPromise: Promise<boolean> | null = null;

  constructor(args: { config: ClientConfig; queryClient: QueryClient }) {
    this.config = args.config;
    this.queryClient = args.queryClient;

    const tokenStoreTyped: TokenStore = tokenStore;
    const createApiClientTyped: (config: {
      baseUrl: string;
      getToken: () => string | null;
    }) => ApiClient = createApiClient;
    this.tokenStore = tokenStoreTyped;

    // Create API client for auth operations
    this.api = createApiClientTyped({
      baseUrl: this.config.apiUrl,
      getToken: () => tokenStoreTyped.get(),
    });

    // Start refresh interval if we have a token
    if (tokenStoreTyped.get()) {
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
    if (this.tokenStore.get()) {
      try {
        return await this.fetchCurrentUser();
      } catch (error) {
        // eslint-disable-next-line no-console -- Intentional warning for debugging auth failures
        console.warn('[AuthService] Failed to fetch current user during initialization:', error);
        return null;
      }
    }

    // No token in memory - try to restore session from refresh token cookie
    try {
      const refreshed = await this.refreshToken();
      if (refreshed) {
        return await this.fetchCurrentUser();
      }
      // No refresh token available - user is not logged in (this is normal)
      return null;
    } catch (error) {
      // eslint-disable-next-line no-console -- Intentional warning for debugging auth failures
      console.warn('[AuthService] Failed to restore session during initialization:', error);
      return null;
    }
  }

  // ==========================================================================
  // State Management
  // ==========================================================================

  /** Get current auth state */
  getState(): AuthState {
    const user = this.queryClient.getQueryData<User>(['auth', 'me']);
    const queryState = this.queryClient.getQueryState(['auth', 'me']);
    const hasToken = Boolean(this.tokenStore.get());

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

  /** Refresh access token (with mutex to prevent concurrent refresh requests) */
  async refreshToken(): Promise<boolean> {
    // If refresh already in progress, wait for it
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    // Start new refresh
    this.refreshPromise = this.performRefresh();

    try {
      return await this.refreshPromise;
    } finally {
      this.refreshPromise = null;
    }
  }

  /** Perform the actual token refresh */
  private async performRefresh(): Promise<boolean> {
    try {
      const response = await this.api.refresh();
      this.tokenStore.set(response.token);
      this.resetRefreshBackoff();
      this.notifyListeners();
      return true;
    } catch {
      // Refresh failed - clear auth state
      this.clearAuth();
      return false;
    }
  }

  /** Reset backoff state after successful refresh */
  private resetRefreshBackoff(): void {
    this.refreshBackoffMs = 0;
    this.consecutiveRefreshFailures = 0;
  }

  /** Calculate next backoff delay using exponential backoff */
  private incrementRefreshBackoff(): void {
    this.consecutiveRefreshFailures += 1;
    // Exponential backoff: 2^failures * base interval, capped at max
    const baseDelay = this.config.tokenRefreshInterval;
    const exponentialDelay = Math.pow(2, this.consecutiveRefreshFailures) * baseDelay;
    this.refreshBackoffMs = Math.min(exponentialDelay, MAX_REFRESH_BACKOFF_MS);
  }

  /** Fetch current user (call on app load if token exists) */
  async fetchCurrentUser(): Promise<User | null> {
    if (!this.tokenStore.get()) {
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
  forgotPassword(data: ForgotPasswordRequest): Promise<ForgotPasswordResponse> {
    return this.api.forgotPassword(data);
  }

  /** Reset password with token */
  resetPassword(data: ResetPasswordRequest): Promise<ResetPasswordResponse> {
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
  resendVerification(data: ResendVerificationRequest): Promise<ResendVerificationResponse> {
    return this.api.resendVerification(data);
  }

  // ==========================================================================
  // Private Helpers
  // ==========================================================================

  private handleAuthSuccess(response: AuthResponse): void {
    this.tokenStore.set(response.token);
    this.queryClient.setQueryData(['auth', 'me'], response.user);
    this.startRefreshInterval();
    this.notifyListeners();
  }

  private clearAuth(): void {
    this.tokenStore.clear();
    this.queryClient.removeQueries({ queryKey: ['auth', 'me'], exact: true });
    this.notifyListeners();
  }

  private startRefreshInterval(): void {
    this.stopRefreshInterval();
    this.scheduleNextRefresh();
  }

  /** Schedule the next token refresh with backoff support */
  private scheduleNextRefresh(): void {
    // Use backoff delay if set, otherwise use normal interval
    const delay =
      this.refreshBackoffMs > 0 ? this.refreshBackoffMs : this.config.tokenRefreshInterval;

    this.refreshIntervalId = setTimeout(() => {
      void this.performScheduledRefresh();
    }, delay);
  }

  /** Perform scheduled refresh and reschedule based on result */
  private async performScheduledRefresh(): Promise<void> {
    const success = await this.refreshToken();

    if (success) {
      // On success, backoff is already reset in refreshToken()
      // Schedule next refresh at normal interval
      this.scheduleNextRefresh();
    } else {
      // On failure, increment backoff and reschedule if we still have a token
      // (refreshToken() calls clearAuth() on failure, but we check anyway)
      if (this.tokenStore.get()) {
        this.incrementRefreshBackoff();
        this.scheduleNextRefresh();
      }
    }
  }

  private stopRefreshInterval(): void {
    if (this.refreshIntervalId) {
      clearTimeout(this.refreshIntervalId);
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
