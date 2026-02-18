// main/apps/web/src/features/auth/services/AuthService.ts
/**
 * AuthService - Manages authentication state and operations.
 *
 * Encapsulates auth logic previously spread across AuthContext.
 * Uses internal state management for user data, token store for persistence.
 */

import { createAuthRoute, type AuthRouteClient } from '@api/auth/route';
import { getApiClient, NetworkError } from '@bslt/api';
import { MS_PER_MINUTE, tokenStore } from '@bslt/shared';

import type { ClientConfig } from '@/config';
import type {
  AuthResponse,
  EmailVerificationRequest,
  EmailVerificationResponse,
  ForgotPasswordRequest,
  ForgotPasswordResponse,
  LoginRequest,
  LoginSuccessResponse,
  MagicLinkRequest,
  MagicLinkRequestResponse,
  RegisterRequest,
  RegisterResponse,
  ResendVerificationRequest,
  ResendVerificationResponse,
  ResetPasswordRequest,
  ResetPasswordResponse,
  SmsLoginChallengeResponse,
  TotpLoginChallengeResponse,
  User,
} from '@bslt/api';

interface TokenStore {
  get: () => string | null;
  set: (token: string) => void;
  clear: () => void;
}

// ============================================================================
// Types
// ============================================================================

export type AuthState = {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isNewDevice: boolean;
};

/**
 * Error thrown when login requires TOTP verification.
 * Contains the challenge token that must be sent back with the TOTP code.
 *
 * @complexity O(1)
 */
export class TotpChallengeError extends Error {
  /** Challenge JWT token to send back with the TOTP code */
  readonly challengeToken: string;

  constructor(challengeToken: string) {
    super('Two-factor authentication required');
    this.name = 'TotpChallengeError';
    this.challengeToken = challengeToken;
  }
}

/**
 * Error thrown when login requires SMS verification.
 * Contains the challenge token that must be sent with the SMS code.
 */
export class SmsChallengeError extends Error {
  /** Challenge JWT token to send back with the SMS code */
  readonly challengeToken: string;

  constructor(challengeToken: string) {
    super('SMS verification required');
    this.name = 'SmsChallengeError';
    this.challengeToken = challengeToken;
  }
}

type LoginResponse = LoginSuccessResponse | TotpLoginChallengeResponse | SmsLoginChallengeResponse;

function isTotpChallengeResponse(response: LoginResponse): response is TotpLoginChallengeResponse {
  return 'requiresTotp' in response && response.requiresTotp;
}

function isSmsChallengeResponse(response: LoginResponse): response is SmsLoginChallengeResponse {
  return 'requiresSms' in response && response.requiresSms;
}

// ============================================================================
// AuthService Class
// ============================================================================

// Maximum backoff delay for token refresh (5 minutes)
const MAX_REFRESH_BACKOFF_MS = 5 * MS_PER_MINUTE;
const REQUEST_TIMEOUT_MS = 8000;
// Type guard for User
const isUser = (value: unknown): value is User => {
  return (
    value !== null &&
    value !== undefined &&
    typeof value === 'object' &&
    'id' in value &&
    'email' in value &&
    'role' in value
  );
};

const withTimeout = async <T>(promise: Promise<T>, label: string): Promise<T> =>
  new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${label} timed out after ${String(REQUEST_TIMEOUT_MS)}ms`));
    }, REQUEST_TIMEOUT_MS);

    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error: unknown) => {
        clearTimeout(timer);
        reject(error instanceof Error ? error : new Error(String(error)));
      });
  });

const normalizeUser = (user: User): User => ({
  ...user,
  firstName: typeof user.firstName === 'string' ? user.firstName : '',
  lastName: typeof user.lastName === 'string' ? user.lastName : '',
});

export class AuthService {
  private readonly api: AuthRouteClient;
  private readonly config: ClientConfig;
  private readonly tokenStore: TokenStore;
  private refreshIntervalId: ReturnType<typeof setTimeout> | null = null;
  private readonly listeners: Set<() => void> = new Set();
  private initialized = false;
  private refreshBackoffMs = 0;
  private consecutiveRefreshFailures = 0;
  private refreshPromise: Promise<boolean> | null = null;

  /** Current authenticated user (internal state, replaces QueryClient) */
  private user: User | null = null;
  /** Whether user data is currently being loaded */
  private isLoadingUser = false;
  /** Whether auth is currently initializing (restoring session on app load) */
  private isInitializing = false;
  /** Whether the current login was from a new/unrecognized device */
  private newDevice = false;

  constructor(args: {
    config: ClientConfig;
    onTosRequired?: (payload: { documentId: string; requiredVersion: number }) => Promise<void>;
  }) {
    this.config = args.config;

    const sharedTokenStore = tokenStore as TokenStore;
    this.tokenStore = {
      get: (): string | null => sharedTokenStore.get(),
      set: (token: string): void => {
        sharedTokenStore.set(token);
      },
      clear: (): void => {
        sharedTokenStore.clear();
      },
    };

    const apiClient = getApiClient({
      baseUrl: this.config.apiUrl,
      getToken: (): string | null => this.tokenStore.get(),
      ...(args.onTosRequired !== undefined ? { onTosRequired: args.onTosRequired } : {}),
    });
    this.api = createAuthRoute(apiClient);

    // Start refresh interval if we have a token
    const currentToken: string | null = this.tokenStore.get();
    if (currentToken !== null) {
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
    this.isInitializing = true;
    this.notifyListeners(); // Notify that we're initializing

    try {
      // If we already have a token in memory, fetch the user
      const existingToken: string | null = this.tokenStore.get();
      if (existingToken !== null) {
        try {
          const user = await this.fetchCurrentUser();
          return user;
        } catch {
          return null;
        } finally {
          this.isInitializing = false;
          this.notifyListeners();
        }
      }

      // No token in memory - try to restore session from refresh token cookie
      try {
        const refreshed = await this.refreshToken();
        if (refreshed) {
          const user = await this.fetchCurrentUser();
          return user;
        }
        // No refresh token available - user is not logged in (this is normal)
        return null;
      } catch {
        return null;
      }
    } finally {
      this.isInitializing = false;
      this.notifyListeners();
    }
  }

  // ==========================================================================
  // State Management
  // ==========================================================================

  /** Get current auth state */
  getState(): AuthState {
    const hasToken = Boolean(this.tokenStore.get());

    return {
      user: this.user,
      isLoading: this.isInitializing || (hasToken && this.isLoadingUser),
      isAuthenticated: Boolean(this.user),
      isNewDevice: this.newDevice,
    };
  }

  /** Dismiss the new device banner */
  dismissNewDeviceBanner(): void {
    this.newDevice = false;
    this.notifyListeners();
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

  /**
   * Login with email/password.
   * Throws TotpChallengeError if user has 2FA enabled.
   *
   * @throws {TotpChallengeError} When 2FA verification is required
   */
  async login(credentials: LoginRequest): Promise<void> {
    const response = await this.api.login(credentials);

    if (isTotpChallengeResponse(response)) {
      throw new TotpChallengeError(response.challengeToken);
    }

    if (isSmsChallengeResponse(response)) {
      throw new SmsChallengeError(response.challengeToken);
    }

    this.handleBffLoginSuccess(response);
    await this.hydrateSessionAfterLogin();

    // Track new device flag for banner display
    if (response.isNewDevice === true) {
      this.newDevice = true;
      this.notifyListeners();
    }
  }

  /**
   * Verify TOTP code during login challenge.
   * Called after login throws TotpChallengeError.
   *
   * @param challengeToken - JWT challenge token from TotpChallengeError
   * @param code - 6-digit TOTP code from authenticator app
   */
  async verifyTotpLogin(challengeToken: string, code: string): Promise<void> {
    const response = await this.api.totpVerifyLogin({ challengeToken, code });
    this.handleAuthSuccess(response);
  }

  /** Send SMS verification code during login challenge. */
  async sendSmsCode(challengeToken: string): Promise<void> {
    await this.api.smsSendCode({ challengeToken });
  }

  /**
   * Verify SMS code during login challenge.
   * Called after login throws SmsChallengeError and user enters the code.
   */
  async verifySmsLogin(challengeToken: string, code: string): Promise<void> {
    const response = await this.api.smsVerifyLogin({ challengeToken, code });
    this.handleAuthSuccess(response);
  }

  /** Register new account - returns pending status, user must verify email */
  async register(data: RegisterRequest): Promise<RegisterResponse> {
    const response = await this.api.register(data);
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
      // Continue with local cleanup even if server logout fails
    }

    this.clearAuth();
  }

  /** Refresh access token (with mutex to prevent concurrent refresh requests) */
  async refreshToken(): Promise<boolean> {
    // If refresh already in progress, wait for it
    if (this.refreshPromise !== null) {
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
      const response = await withTimeout(this.api.refresh(), 'Token refresh');
      // Type guard: ensure response has token property
      const respObj = response as { token?: string };
      if (typeof respObj.token === 'string') {
        this.tokenStore.set(respObj.token);
        this.resetRefreshBackoff();
        this.notifyListeners();
        return true;
      }
      throw new Error('Invalid response format from refresh API');
    } catch (error: unknown) {
      // Network errors and timeouts: keep session, let backoff retry
      if (
        error instanceof NetworkError ||
        (error instanceof Error && error.message.includes('timed out'))
      ) {
        return false;
      }
      // Auth errors (401, invalid token, etc.): clear session
      void error;
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
    const currentToken: string | null = this.tokenStore.get();
    if (currentToken === null) {
      return null;
    }

    this.isLoadingUser = true;
    this.notifyListeners();

    try {
      const userResult = await withTimeout<User>(this.api.getCurrentUser(), 'Fetch current user');
      if (isUser(userResult)) {
        this.user = normalizeUser(userResult);
        this.isLoadingUser = false;
        this.startRefreshInterval();
        this.notifyListeners();
        return this.user;
      }
      throw new Error('Invalid user data received from API');
    } catch {
      // Token might be expired, try refresh
      const refreshed = await this.refreshToken();
      if (refreshed) {
        try {
          const refreshedUser = await withTimeout<User>(
            this.api.getCurrentUser(),
            'Fetch current user',
          );
          this.user = normalizeUser(refreshedUser);
          this.isLoadingUser = false;
          this.startRefreshInterval();
          this.notifyListeners();
          return this.user;
        } catch {
          this.isLoadingUser = false;
          this.clearAuth();
          return null;
        }
      }
      this.isLoadingUser = false;
      this.notifyListeners();
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
    const response = await this.api.verifyEmail(data);
    // Auto-login on successful verification
    this.handleAuthSuccess({ token: response.token, user: response.user });
    return response;
  }

  /** Resend verification email */
  resendVerification(data: ResendVerificationRequest): Promise<ResendVerificationResponse> {
    return this.api.resendVerification(data);
  }

  /** Request magic link for passwordless login */
  requestMagicLink(data: MagicLinkRequest): Promise<MagicLinkRequestResponse> {
    return this.api.magicLinkRequest(data);
  }

  /** Verify magic link token and login */
  async verifyMagicLink(data: { token: string }): Promise<void> {
    const response = await this.api.magicLinkVerify(data);
    this.handleAuthSuccess({ token: response.token, user: response.user });
  }

  // ==========================================================================
  // Private Helpers
  // ==========================================================================

  private handleAuthSuccess(response: AuthResponse): void {
    if (response.token.length > 0) {
      this.tokenStore.set(response.token);
    } else {
      this.tokenStore.clear();
    }
    this.user = normalizeUser(response.user);
    this.isLoadingUser = false;
    this.startRefreshInterval();
    this.notifyListeners();
  }

  private handleBffLoginSuccess(response: LoginSuccessResponse): void {
    this.tokenStore.clear();
    this.user = normalizeUser(response.user);
    this.isLoadingUser = false;
    this.notifyListeners();
  }

  private async hydrateSessionAfterLogin(): Promise<void> {
    try {
      const refreshResponse = await withTimeout(this.api.refresh(), 'Token refresh');
      const refreshObj = refreshResponse as { token?: unknown };
      if (typeof refreshObj.token === 'string' && refreshObj.token.length > 0) {
        this.tokenStore.set(refreshObj.token);
        this.startRefreshInterval();
      }

      const userResult = await withTimeout<User>(this.api.getCurrentUser(), 'Fetch current user');
      if (isUser(userResult)) {
        this.user = normalizeUser(userResult);
        this.notifyListeners();
      }
    } catch {
      // Keep user from login response.
    }
  }

  private clearAuth(): void {
    this.tokenStore.clear();
    this.user = null;
    this.isLoadingUser = false;
    this.newDevice = false;
    this.initialized = false; // Allow re-initialization after logout
    this.stopRefreshInterval();
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
      // (network errors preserve the token; auth errors clear it)
      const stillHasToken: string | null = this.tokenStore.get();
      if (stillHasToken !== null) {
        this.incrementRefreshBackoff();
        this.scheduleNextRefresh();
      }
    }
  }

  private stopRefreshInterval(): void {
    if (this.refreshIntervalId !== null) {
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
  onTosRequired?: (payload: { documentId: string; requiredVersion: number }) => Promise<void>;
}): AuthService {
  return new AuthService(args);
}
