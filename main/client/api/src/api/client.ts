// main/client/api/src/api/client.ts

import {
  acceptTosResponseSchema,
  addAuthHeader,
  authResponseSchema,
  changeEmailResponseSchema,
  confirmEmailChangeResponseSchema,
  emailVerificationResponseSchema,
  ERROR_CODES,
  forgotPasswordResponseSchema,
  HTTP_STATUS,
  logoutResponseSchema,
  magicLinkRequestResponseSchema,
  magicLinkVerifyResponseSchema,
  oauthConnectionsResponseSchema,
  oauthEnabledProvidersResponseSchema,
  oauthUnlinkResponseSchema,
  refreshResponseSchema,
  registerResponseSchema,
  resendVerificationResponseSchema,
  resetPasswordResponseSchema,
  revertEmailChangeResponseSchema,
  setPasswordResponseSchema,
  tosStatusResponseSchema,
  totpSetupResponseSchema,
  totpStatusResponseSchema,
  totpVerifyResponseSchema,
  updateConsentPreferencesRequestSchema,
  userSchema,
} from '@bslt/shared';

import { createApiError, NetworkError } from '../errors';
import { API_PREFIX, createRequestFactory } from '../utils';

import { parseLoginResponse } from './login-response';

import type {
  AuthResponse,
  ChangeEmailRequest,
  ChangeEmailResponse,
  ConfirmEmailChangeRequest,
  ConfirmEmailChangeResponse,
  EmailVerificationRequest,
  EmailVerificationResponse,
  ForgotPasswordRequest,
  ForgotPasswordResponse,
  LoginRequest,
  LoginSuccessResponse,
  LogoutResponse,
  MagicLinkRequest,
  MagicLinkRequestResponse,
  MagicLinkVerifyRequest,
  MagicLinkVerifyResponse,
  OAuthConnectionsResponse,
  OAuthEnabledProvidersResponse,
  OAuthProvider,
  OAuthUnlinkResponse,
  PasskeyListItem,
  RefreshResponse,
  RegisterRequest,
  RegisterResponse,
  ResendVerificationRequest,
  ResendVerificationResponse,
  ResetPasswordRequest,
  ResetPasswordResponse,
  RevertEmailChangeRequest,
  RevertEmailChangeResponse,
  SetPasswordRequest,
  SetPasswordResponse,
  SmsLoginChallengeResponse,
  TotpLoginChallengeResponse,
  TotpLoginVerifyRequest,
  TotpSetupResponse,
  TotpStatusResponse,
  TotpVerifyRequest,
  TotpVerifyResponse,
  UpdateConsentPreferencesRequest,
  User,
} from '@bslt/shared';
import type { ApiErrorBody } from '../errors';
import type { BaseClientConfig } from '../utils';

/** Payload emitted when the server requires ToS acceptance (403 TOS_ACCEPTANCE_REQUIRED) */
export interface TosRequiredPayload {
  documentId: string;
  requiredVersion: number;
}

export interface ApiClientConfig extends BaseClientConfig {
  /**
   * Called when the server returns 403 with code TOS_ACCEPTANCE_REQUIRED.
   * The promise should resolve after the user accepts the ToS,
   * allowing the original request to be retried automatically.
   * If not provided, the 403 error is thrown normally.
   */
  onTosRequired?: (payload: TosRequiredPayload) => Promise<void>;
}

export interface ApiClient {
  acceptTos: (documentId: string) => Promise<{ agreedAt: string }>;
  getConsent: () => Promise<{ preferences: Record<string, boolean | null> }>;
  updateConsent: (
    data: UpdateConsentPreferencesRequest,
  ) => Promise<{ preferences: Record<string, boolean | null>; updated: number }>;
  requestDataExport: () => Promise<{ exportRequest: Record<string, unknown> }>;
  getDataExportStatus: (requestId: string) => Promise<{ exportRequest: Record<string, unknown> }>;
  getFile: (fileId: string) => Promise<Record<string, unknown>>;
  uploadFile: (formData: FormData) => Promise<Record<string, unknown>>;
  deleteFile: (fileId: string) => Promise<Record<string, unknown>>;
  downloadFile: (fileId: string) => Promise<Blob>;
  evaluateFeatureFlags: (tenantId?: string) => Promise<{ flags: Record<string, boolean> }>;
  listTenantAuditEvents: (tenantId: string) => Promise<{ events: Record<string, unknown>[] }>;
  listTenantActivities: (tenantId: string) => Promise<{ activities: Record<string, unknown>[] }>;
  regenerateTenantInvitation: (
    tenantId: string,
    invitationId: string,
  ) => Promise<Record<string, unknown>>;
  transferTenantOwnership: (
    tenantId: string,
    data: { newOwnerId: string },
  ) => Promise<Record<string, unknown>>;
  listTenantFeatureOverrides: (tenantId: string) => Promise<{
    overrides: Array<{ tenantId: string; key: string; value: unknown; isEnabled: boolean }>;
  }>;
  setTenantFeatureOverride: (
    tenantId: string,
    key: string,
    data: { value?: unknown; isEnabled?: boolean },
  ) => Promise<{ override: { tenantId: string; key: string; value: unknown; isEnabled: boolean } }>;
  deleteTenantFeatureOverride: (tenantId: string, key: string) => Promise<{ success: boolean }>;
  startImpersonation: (
    userId: string,
  ) => Promise<{ token: string; targetUserId: string; targetEmail: string; expiresAt: string }>;
  endImpersonation: (targetUserId: string) => Promise<{ success: boolean; message: string }>;
  listAdminAuditEvents: () => Promise<Record<string, unknown>>;
  unlockAdminAuth: (data: { reason: string; email?: string }) => Promise<Record<string, unknown>>;
  listAdminJobs: () => Promise<Record<string, unknown>>;
  getAdminMetrics: () => Promise<Record<string, unknown>>;
  listAdminTenants: () => Promise<Record<string, unknown>>;
  getAdminTenant: (tenantId: string) => Promise<Record<string, unknown>>;
  suspendAdminTenant: (tenantId: string, reason: string) => Promise<Record<string, unknown>>;
  unsuspendAdminTenant: (tenantId: string) => Promise<Record<string, unknown>>;
  listAdminUsers: () => Promise<Record<string, unknown>>;
  searchAdminUsers: () => Promise<Record<string, unknown>>;
  hardBanAdminUser: (userId: string, reason: string) => Promise<Record<string, unknown>>;
  publishLegalDocument: (data: Record<string, unknown>) => Promise<Record<string, unknown>>;
  listActivities: () => Promise<Record<string, unknown>>;
  getCurrentLegalDocument: () => Promise<Record<string, unknown>>;
  getUserAgreements: () => Promise<Record<string, unknown>>;
  login: (
    data: LoginRequest,
  ) => Promise<LoginSuccessResponse | TotpLoginChallengeResponse | SmsLoginChallengeResponse>;
  register: (data: RegisterRequest) => Promise<RegisterResponse>;
  refresh: () => Promise<RefreshResponse>;
  logout: () => Promise<LogoutResponse>;
  logoutAll: () => Promise<LogoutResponse>;
  getCurrentUser: () => Promise<User>;
  forgotPassword: (data: ForgotPasswordRequest) => Promise<ForgotPasswordResponse>;
  resetPassword: (data: ResetPasswordRequest) => Promise<ResetPasswordResponse>;
  setPassword: (data: SetPasswordRequest) => Promise<SetPasswordResponse>;
  verifyEmail: (data: EmailVerificationRequest) => Promise<EmailVerificationResponse>;
  resendVerification: (data: ResendVerificationRequest) => Promise<ResendVerificationResponse>;
  // TOTP methods
  totpSetup: () => Promise<TotpSetupResponse>;
  totpEnable: (data: TotpVerifyRequest) => Promise<TotpVerifyResponse>;
  totpDisable: (data: TotpVerifyRequest) => Promise<TotpVerifyResponse>;
  totpStatus: () => Promise<TotpStatusResponse>;
  totpVerifyLogin: (data: TotpLoginVerifyRequest) => Promise<AuthResponse>;
  // SMS 2FA methods
  smsSendCode: (data: { challengeToken: string }) => Promise<{ message: string }>;
  smsVerifyLogin: (data: { challengeToken: string; code: string }) => Promise<AuthResponse>;
  // Magic link methods
  magicLinkRequest: (data: MagicLinkRequest) => Promise<MagicLinkRequestResponse>;
  magicLinkVerify: (data: MagicLinkVerifyRequest) => Promise<MagicLinkVerifyResponse>;
  // Email change methods
  changeEmail: (data: ChangeEmailRequest) => Promise<ChangeEmailResponse>;
  confirmEmailChange: (data: ConfirmEmailChangeRequest) => Promise<ConfirmEmailChangeResponse>;
  revertEmailChange: (data: RevertEmailChangeRequest) => Promise<RevertEmailChangeResponse>;
  // OAuth methods
  getEnabledOAuthProviders: () => Promise<OAuthEnabledProvidersResponse>;
  getOAuthConnections: () => Promise<OAuthConnectionsResponse>;
  unlinkOAuthProvider: (provider: OAuthProvider) => Promise<OAuthUnlinkResponse>;
  getOAuthLoginUrl: (provider: OAuthProvider) => string;
  getOAuthLinkUrl: (provider: OAuthProvider) => string;
  // WebAuthn/Passkey methods
  webauthnRegisterOptions: () => Promise<{ options: Record<string, unknown> }>;
  webauthnRegisterVerify: (data: {
    credential: Record<string, unknown>;
    name?: string;
  }) => Promise<{ credentialId: string; message: string }>;
  webauthnLoginOptions: (email?: string) => Promise<{ options: Record<string, unknown> }>;
  webauthnLoginVerify: (data: {
    credential: Record<string, unknown>;
    sessionKey: string;
  }) => Promise<AuthResponse>;
  listPasskeys: () => Promise<PasskeyListItem[]>;
  renamePasskey: (id: string, name: string) => Promise<{ message: string }>;
  deletePasskey: (id: string) => Promise<{ message: string }>;
  listUsers: () => Promise<Record<string, unknown>>;
  getSessionCount: () => Promise<{ count: number }>;
  getTosStatus: () => Promise<{
    accepted: boolean;
    requiredVersion: number | null;
    documentId: string | null;
  }>;
}

export function createApiClient(config: ApiClientConfig): ApiClient {
  const { baseUrl, fetcher } = createRequestFactory(config);
  const safeMethods = new Set(['GET', 'HEAD', 'OPTIONS']);
  let csrfToken: string | null = null;

  type ResponseSchema<T> = {
    parse(data: unknown): T;
  };

  const isCsrfError = (status: number, data: Record<string, unknown>): boolean => {
    if (status !== HTTP_STATUS.FORBIDDEN) return false;
    const message = typeof data['message'] === 'string' ? data['message'].toLowerCase() : '';
    return message.includes('csrf');
  };

  const fetchCsrfToken = async (): Promise<string> => {
    const response = await fetcher(`${baseUrl}${API_PREFIX}/csrf-token`, {
      method: 'GET',
      credentials: 'include',
    });

    const data = (await response.json().catch(() => ({}))) as {
      token?: unknown;
      message?: unknown;
    };
    if (!response.ok || typeof data.token !== 'string' || data.token.length === 0) {
      throw createApiError(response.status, {
        message: typeof data.message === 'string' ? data.message : 'Failed to fetch CSRF token',
      });
    }

    csrfToken = data.token;
    return data.token;
  };

  // Custom request helper with ToS interception (not shared by other clients)
  const request = async <T>(
    path: string,
    options?: RequestInit,
    responseSchema?: ResponseSchema<T>,
    attempt: number = 0,
  ): Promise<T> => {
    const headers = new Headers(options?.headers);
    headers.set('Content-Type', 'application/json');
    const method = options?.method ?? 'GET';
    const requiresCsrf = !safeMethods.has(method.toUpperCase());

    const token = config.getToken?.();
    if (token !== null && token !== undefined) {
      addAuthHeader(headers, token);
    }
    if (requiresCsrf && csrfToken !== null && csrfToken.length > 0) {
      headers.set('x-csrf-token', csrfToken);
    }

    const url = `${baseUrl}${API_PREFIX}${path}`;

    let response: Response;
    try {
      response = await fetcher(url, {
        ...options,
        headers,
        credentials: 'include', // Include cookies for refresh token
      });
    } catch (error: unknown) {
      // Network error (offline, DNS failure, etc.)
      const errorMessage = `Failed to fetch ${options?.method ?? 'GET'} ${path}`;
      const originalError = error instanceof Error ? error : new Error(String(error));
      throw new NetworkError(errorMessage, originalError) as Error;
    }

    const data = (await response.json().catch((parseError: unknown) => {
      void parseError;
      return {};
    })) as Record<string, unknown>;

    if (!response.ok) {
      // Intercept 403 TOS_ACCEPTANCE_REQUIRED: allow caller to show ToS modal and retry
      if (
        response.status === HTTP_STATUS.FORBIDDEN &&
        data['code'] === ERROR_CODES.TOS_ACCEPTANCE_REQUIRED &&
        config.onTosRequired !== undefined
      ) {
        const documentId = typeof data['documentId'] === 'string' ? data['documentId'] : '';
        const requiredVersion =
          typeof data['requiredVersion'] === 'number' ? data['requiredVersion'] : 0;

        if (documentId !== '') {
          // Wait for the user to accept ToS, then retry the original request
          await config.onTosRequired({ documentId, requiredVersion });
          return request<T>(path, options, responseSchema, attempt);
        }
      }
      if (requiresCsrf && attempt === 0 && isCsrfError(response.status, data)) {
        await fetchCsrfToken();
        return request<T>(path, options, responseSchema, 1);
      }

      const errorBody: ApiErrorBody = {};
      if (typeof data['message'] === 'string') {
        errorBody.message = data['message'];
      }
      if (typeof data['code'] === 'string') {
        errorBody.code = data['code'];
      }
      if (typeof data['details'] === 'object' && data['details'] !== null) {
        errorBody.details = data['details'] as Record<string, unknown>;
      }
      throw createApiError(response.status, errorBody);
    }

    if (responseSchema !== undefined) {
      return responseSchema.parse(data);
    }

    return data as T;
  };

  const requestBlob = async (path: string, options?: RequestInit): Promise<Blob> => {
    const headers = new Headers(options?.headers);
    const token = config.getToken?.();
    if (token !== null && token !== undefined) {
      addAuthHeader(headers, token);
    }

    const url = `${baseUrl}${API_PREFIX}${path}`;

    let response: Response;
    try {
      response = await fetcher(url, {
        ...options,
        headers,
        credentials: 'include',
      });
    } catch (error: unknown) {
      const originalError = error instanceof Error ? error : new Error(String(error));
      throw new NetworkError(`Failed to fetch ${options?.method ?? 'GET'} ${path}`, originalError);
    }

    if (!response.ok) {
      const data = (await response.json().catch(() => ({}))) as ApiErrorBody;
      throw createApiError(response.status, data);
    }

    return response.blob();
  };

  const requestMultipart = async (
    path: string,
    formData: FormData,
    options?: RequestInit,
    attempt: number = 0,
  ): Promise<Record<string, unknown>> => {
    const headers = new Headers();
    const optionHeaders = options?.headers;
    if (optionHeaders instanceof Headers) {
      optionHeaders.forEach((value, key) => {
        headers.set(key, value);
      });
    } else if (Array.isArray(optionHeaders)) {
      for (const [key, value] of optionHeaders) {
        headers.set(key, value);
      }
    } else if (optionHeaders !== undefined) {
      for (const [key, value] of Object.entries(optionHeaders)) {
        if (typeof value === 'string') {
          headers.set(key, value);
        }
      }
    }

    const token = config.getToken?.();
    if (token !== null && token !== undefined) {
      addAuthHeader(headers, token);
    }
    const method = options?.method ?? 'POST';
    const requiresCsrf = !safeMethods.has(method.toUpperCase());
    if (requiresCsrf && csrfToken !== null && csrfToken.length > 0) {
      headers.set('x-csrf-token', csrfToken);
    }

    const response = await fetcher(`${baseUrl}${API_PREFIX}${path}`, {
      ...options,
      method,
      headers,
      body: formData,
      credentials: 'include',
    });

    const data = (await response.json().catch(() => ({}))) as ApiErrorBody &
      Record<string, unknown>;
    if (!response.ok) {
      if (requiresCsrf && attempt === 0 && isCsrfError(response.status, data)) {
        await fetchCsrfToken();
        return requestMultipart(path, formData, options, 1);
      }
      throw createApiError(response.status, data);
    }
    return data;
  };

  return {
    async acceptTos(documentId: string): Promise<{ agreedAt: string }> {
      return request<{ agreedAt: string }>(
        '/auth/tos/accept',
        {
          method: 'POST',
          body: JSON.stringify({ documentId }),
        },
        acceptTosResponseSchema,
      );
    },
    async getConsent(): Promise<{ preferences: Record<string, boolean | null> }> {
      return request<{ preferences: Record<string, boolean | null> }>('/users/me/consent');
    },
    async updateConsent(
      data: UpdateConsentPreferencesRequest,
    ): Promise<{ preferences: Record<string, boolean | null>; updated: number }> {
      const validated = updateConsentPreferencesRequestSchema.parse(data);
      return request<{ preferences: Record<string, boolean | null>; updated: number }>(
        '/users/me/consent/update',
        {
          method: 'PATCH',
          body: JSON.stringify(validated),
        },
      );
    },
    async requestDataExport(): Promise<{ exportRequest: Record<string, unknown> }> {
      return request<{ exportRequest: Record<string, unknown> }>('/users/me/export', {
        method: 'POST',
      });
    },
    async getDataExportStatus(
      requestId: string,
    ): Promise<{ exportRequest: Record<string, unknown> }> {
      return request<{ exportRequest: Record<string, unknown> }>(
        `/users/me/export/${requestId}/status`,
      );
    },
    async getFile(fileId: string): Promise<Record<string, unknown>> {
      return request(`/files/${fileId}`);
    },
    async uploadFile(formData: FormData): Promise<Record<string, unknown>> {
      return requestMultipart('/files/upload', formData);
    },
    async deleteFile(fileId: string): Promise<Record<string, unknown>> {
      return request(`/files/${fileId}/delete`, { method: 'POST' });
    },
    async downloadFile(fileId: string): Promise<Blob> {
      return requestBlob(`/files/${fileId}/download`);
    },
    async evaluateFeatureFlags(tenantId?: string): Promise<{ flags: Record<string, boolean> }> {
      const query = tenantId !== undefined ? `?tenantId=${encodeURIComponent(tenantId)}` : '';
      return request<{ flags: Record<string, boolean> }>(`/feature-flags/evaluate${query}`);
    },
    async listTenantAuditEvents(tenantId: string): Promise<{ events: Record<string, unknown>[] }> {
      return request<{ events: Record<string, unknown>[] }>(`/tenants/${tenantId}/audit-events`);
    },
    async listTenantActivities(
      tenantId: string,
    ): Promise<{ activities: Record<string, unknown>[] }> {
      return request<{ activities: Record<string, unknown>[] }>(`/tenants/${tenantId}/activities`);
    },
    async regenerateTenantInvitation(
      tenantId: string,
      invitationId: string,
    ): Promise<Record<string, unknown>> {
      return request<Record<string, unknown>>(
        `/tenants/${tenantId}/invitations/${invitationId}/regenerate`,
        {
          method: 'POST',
        },
      );
    },
    async transferTenantOwnership(
      tenantId: string,
      data: { newOwnerId: string },
    ): Promise<Record<string, unknown>> {
      return request<Record<string, unknown>>(`/tenants/${tenantId}/transfer-ownership`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    async listTenantFeatureOverrides(tenantId: string): Promise<{
      overrides: Array<{ tenantId: string; key: string; value: unknown; isEnabled: boolean }>;
    }> {
      return request<{
        overrides: Array<{ tenantId: string; key: string; value: unknown; isEnabled: boolean }>;
      }>(`/admin/tenants/${tenantId}/feature-overrides`);
    },
    async setTenantFeatureOverride(
      tenantId: string,
      key: string,
      data: { value?: unknown; isEnabled?: boolean },
    ): Promise<{
      override: { tenantId: string; key: string; value: unknown; isEnabled: boolean };
    }> {
      return request<{
        override: { tenantId: string; key: string; value: unknown; isEnabled: boolean };
      }>(`/admin/tenants/${tenantId}/feature-overrides/${key}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },
    async deleteTenantFeatureOverride(
      tenantId: string,
      key: string,
    ): Promise<{ success: boolean }> {
      return request<{ success: boolean }>(
        `/admin/tenants/${tenantId}/feature-overrides/${key}/delete`,
        {
          method: 'POST',
        },
      );
    },
    async startImpersonation(
      userId: string,
    ): Promise<{ token: string; targetUserId: string; targetEmail: string; expiresAt: string }> {
      return request<{
        token: string;
        targetUserId: string;
        targetEmail: string;
        expiresAt: string;
      }>(`/admin/impersonate/${userId}`, {
        method: 'POST',
      });
    },
    async endImpersonation(targetUserId: string): Promise<{ success: boolean; message: string }> {
      return request<{ success: boolean; message: string }>('/admin/impersonate/end', {
        method: 'POST',
        body: JSON.stringify({ targetUserId }),
      });
    },
    async listAdminAuditEvents(): Promise<Record<string, unknown>> {
      return request('/admin/audit-events');
    },
    async unlockAdminAuth(data: {
      reason: string;
      email?: string;
    }): Promise<Record<string, unknown>> {
      return request('/admin/auth/unlock', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    async listAdminJobs(): Promise<Record<string, unknown>> {
      return request('/admin/jobs');
    },
    async getAdminMetrics(): Promise<Record<string, unknown>> {
      return request('/admin/metrics');
    },
    async listAdminTenants(): Promise<Record<string, unknown>> {
      return request('/admin/tenants');
    },
    async getAdminTenant(tenantId: string): Promise<Record<string, unknown>> {
      return request(`/admin/tenants/${tenantId}`);
    },
    async suspendAdminTenant(tenantId: string, reason: string): Promise<Record<string, unknown>> {
      return request(`/admin/tenants/${tenantId}/suspend`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      });
    },
    async unsuspendAdminTenant(tenantId: string): Promise<Record<string, unknown>> {
      return request(`/admin/tenants/${tenantId}/unsuspend`, {
        method: 'POST',
      });
    },
    async listAdminUsers(): Promise<Record<string, unknown>> {
      return request('/admin/users');
    },
    async searchAdminUsers(): Promise<Record<string, unknown>> {
      return request('/admin/users/search');
    },
    async hardBanAdminUser(userId: string, reason: string): Promise<Record<string, unknown>> {
      return request(`/admin/users/${userId}/hard-ban`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      });
    },
    async publishLegalDocument(data: Record<string, unknown>): Promise<Record<string, unknown>> {
      return request('/admin/legal/publish', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    async listActivities(): Promise<Record<string, unknown>> {
      return request('/activities');
    },
    async getCurrentLegalDocument(): Promise<Record<string, unknown>> {
      return request('/legal/current');
    },
    async getUserAgreements(): Promise<Record<string, unknown>> {
      return request('/users/me/agreements');
    },
    async login(
      data: LoginRequest,
    ): Promise<LoginSuccessResponse | TotpLoginChallengeResponse | SmsLoginChallengeResponse> {
      return request(
        '/auth/login',
        { method: 'POST', body: JSON.stringify(data) },
        {
          parse(
            value: unknown,
          ): LoginSuccessResponse | TotpLoginChallengeResponse | SmsLoginChallengeResponse {
            return parseLoginResponse(value);
          },
        },
      );
    },
    async register(data: RegisterRequest): Promise<RegisterResponse> {
      return request<RegisterResponse>(
        '/auth/register',
        {
          method: 'POST',
          body: JSON.stringify(data),
        },
        registerResponseSchema,
      );
    },
    async refresh(): Promise<RefreshResponse> {
      return request<RefreshResponse>(
        '/auth/refresh',
        {
          method: 'POST',
          body: JSON.stringify({}),
        },
        refreshResponseSchema,
      );
    },
    async logout(): Promise<LogoutResponse> {
      return request<LogoutResponse>(
        '/auth/logout',
        {
          method: 'POST',
          body: JSON.stringify({}),
        },
        logoutResponseSchema,
      );
    },
    async logoutAll(): Promise<LogoutResponse> {
      return request<LogoutResponse>(
        '/auth/logout-all',
        {
          method: 'POST',
          body: JSON.stringify({}),
        },
        logoutResponseSchema,
      );
    },
    async getCurrentUser(): Promise<User> {
      return request<User>('/users/me', undefined, userSchema);
    },
    async forgotPassword(data: ForgotPasswordRequest): Promise<ForgotPasswordResponse> {
      return request<ForgotPasswordResponse>(
        '/auth/forgot-password',
        {
          method: 'POST',
          body: JSON.stringify(data),
        },
        forgotPasswordResponseSchema,
      );
    },
    async resetPassword(data: ResetPasswordRequest): Promise<ResetPasswordResponse> {
      return request<ResetPasswordResponse>(
        '/auth/reset-password',
        {
          method: 'POST',
          body: JSON.stringify(data),
        },
        resetPasswordResponseSchema,
      );
    },
    async setPassword(data: SetPasswordRequest): Promise<SetPasswordResponse> {
      return request<SetPasswordResponse>(
        '/auth/set-password',
        {
          method: 'POST',
          body: JSON.stringify(data),
        },
        setPasswordResponseSchema,
      );
    },
    async verifyEmail(data: EmailVerificationRequest): Promise<EmailVerificationResponse> {
      return request<EmailVerificationResponse>(
        '/auth/verify-email',
        {
          method: 'POST',
          body: JSON.stringify(data),
        },
        emailVerificationResponseSchema,
      );
    },
    async resendVerification(data: ResendVerificationRequest): Promise<ResendVerificationResponse> {
      return request<ResendVerificationResponse>(
        '/auth/resend-verification',
        {
          method: 'POST',
          body: JSON.stringify(data),
        },
        resendVerificationResponseSchema,
      );
    },
    async getTosStatus(): Promise<{
      accepted: boolean;
      requiredVersion: number | null;
      documentId: string | null;
    }> {
      return request('/auth/tos/status', undefined, tosStatusResponseSchema);
    },
    async listUsers(): Promise<Record<string, unknown>> {
      return request('/users/list');
    },
    async getSessionCount(): Promise<{ count: number }> {
      return request('/users/me/sessions/count');
    },
    // TOTP methods
    async totpSetup(): Promise<TotpSetupResponse> {
      return request<TotpSetupResponse>(
        '/auth/totp/setup',
        {
          method: 'POST',
          body: JSON.stringify({}),
        },
        totpSetupResponseSchema,
      );
    },
    async totpEnable(data: TotpVerifyRequest): Promise<TotpVerifyResponse> {
      return request<TotpVerifyResponse>(
        '/auth/totp/enable',
        {
          method: 'POST',
          body: JSON.stringify(data),
        },
        totpVerifyResponseSchema,
      );
    },
    async totpDisable(data: TotpVerifyRequest): Promise<TotpVerifyResponse> {
      return request<TotpVerifyResponse>(
        '/auth/totp/disable',
        {
          method: 'POST',
          body: JSON.stringify(data),
        },
        totpVerifyResponseSchema,
      );
    },
    async totpStatus(): Promise<TotpStatusResponse> {
      return request<TotpStatusResponse>('/auth/totp/status', undefined, totpStatusResponseSchema);
    },
    async totpVerifyLogin(data: TotpLoginVerifyRequest): Promise<AuthResponse> {
      return request<AuthResponse>(
        '/auth/totp/verify-login',
        {
          method: 'POST',
          body: JSON.stringify(data),
        },
        authResponseSchema,
      );
    },
    // SMS 2FA methods
    async smsSendCode(data: { challengeToken: string }): Promise<{ message: string }> {
      return request<{ message: string }>(
        '/auth/sms/send',
        {
          method: 'POST',
          body: JSON.stringify(data),
        },
        totpVerifyResponseSchema,
      );
    },
    async smsVerifyLogin(data: { challengeToken: string; code: string }): Promise<AuthResponse> {
      return request<AuthResponse>(
        '/auth/sms/verify',
        {
          method: 'POST',
          body: JSON.stringify(data),
        },
        authResponseSchema,
      );
    },
    // Magic link methods
    async magicLinkRequest(data: MagicLinkRequest): Promise<MagicLinkRequestResponse> {
      return request<MagicLinkRequestResponse>(
        '/auth/magic-link/request',
        {
          method: 'POST',
          body: JSON.stringify(data),
        },
        magicLinkRequestResponseSchema,
      );
    },
    async magicLinkVerify(data: MagicLinkVerifyRequest): Promise<MagicLinkVerifyResponse> {
      return request<MagicLinkVerifyResponse>(
        '/auth/magic-link/verify',
        {
          method: 'POST',
          body: JSON.stringify(data),
        },
        magicLinkVerifyResponseSchema,
      );
    },
    // Email change methods
    async changeEmail(data: ChangeEmailRequest): Promise<ChangeEmailResponse> {
      return request<ChangeEmailResponse>(
        '/auth/change-email',
        {
          method: 'POST',
          body: JSON.stringify(data),
        },
        changeEmailResponseSchema,
      );
    },
    async confirmEmailChange(data: ConfirmEmailChangeRequest): Promise<ConfirmEmailChangeResponse> {
      return request<ConfirmEmailChangeResponse>(
        '/auth/change-email/confirm',
        {
          method: 'POST',
          body: JSON.stringify(data),
        },
        confirmEmailChangeResponseSchema,
      );
    },
    async revertEmailChange(data: RevertEmailChangeRequest): Promise<RevertEmailChangeResponse> {
      return request<RevertEmailChangeResponse>(
        '/auth/change-email/revert',
        {
          method: 'POST',
          body: JSON.stringify(data),
        },
        revertEmailChangeResponseSchema,
      );
    },
    // OAuth methods
    async getEnabledOAuthProviders(): Promise<OAuthEnabledProvidersResponse> {
      return request('/auth/oauth/providers', undefined, oauthEnabledProvidersResponseSchema);
    },
    async getOAuthConnections(): Promise<OAuthConnectionsResponse> {
      return request('/auth/oauth/connections', undefined, oauthConnectionsResponseSchema);
    },
    async unlinkOAuthProvider(provider: OAuthProvider): Promise<OAuthUnlinkResponse> {
      // OAuthProvider is already a string literal union type
      const providerStr = provider as string;
      return request<OAuthUnlinkResponse>(
        `/auth/oauth/${providerStr}/unlink`,
        {
          method: 'DELETE',
        },
        oauthUnlinkResponseSchema,
      );
    },
    getOAuthLoginUrl(provider: OAuthProvider): string {
      // This returns a URL the browser should navigate to (redirect)
      const providerStr = provider as string;
      return `${baseUrl}${API_PREFIX}/auth/oauth/${providerStr}`;
    },
    getOAuthLinkUrl(provider: OAuthProvider): string {
      // This returns the link initiation endpoint - must be called with auth
      const providerStr = provider as string;
      return `${baseUrl}${API_PREFIX}/auth/oauth/${providerStr}/link`;
    },
    // WebAuthn/Passkey methods
    async webauthnRegisterOptions(): Promise<{ options: Record<string, unknown> }> {
      return request<{ options: Record<string, unknown> }>(
        '/auth/webauthn/register/options',
        {
          method: 'POST',
          body: JSON.stringify({}),
        },
        {
          parse(value: unknown): { options: Record<string, unknown> } {
            if (value === null || typeof value !== 'object') {
              throw new Error('Invalid WebAuthn options response');
            }
            const obj = value as Record<string, unknown>;
            if (obj['options'] === null || typeof obj['options'] !== 'object') {
              throw new Error('Invalid WebAuthn options payload');
            }
            return { options: obj['options'] as Record<string, unknown> };
          },
        },
      );
    },
    async webauthnRegisterVerify(data: {
      credential: Record<string, unknown>;
      name?: string;
    }): Promise<{ credentialId: string; message: string }> {
      return request<{ credentialId: string; message: string }>(
        '/auth/webauthn/register/verify',
        {
          method: 'POST',
          body: JSON.stringify(data),
        },
        {
          parse(value: unknown): { credentialId: string; message: string } {
            if (value === null || typeof value !== 'object') {
              throw new Error('Invalid WebAuthn verify response');
            }
            const obj = value as Record<string, unknown>;
            if (typeof obj['credentialId'] !== 'string' || typeof obj['message'] !== 'string') {
              throw new Error('Invalid WebAuthn verify payload');
            }
            return { credentialId: obj['credentialId'], message: obj['message'] };
          },
        },
      );
    },
    async webauthnLoginOptions(email?: string): Promise<{ options: Record<string, unknown> }> {
      return request<{ options: Record<string, unknown> }>(
        '/auth/webauthn/login/options',
        {
          method: 'POST',
          body: JSON.stringify(email !== undefined ? { email } : {}),
        },
        {
          parse(value: unknown): { options: Record<string, unknown> } {
            if (value === null || typeof value !== 'object') {
              throw new Error('Invalid WebAuthn options response');
            }
            const obj = value as Record<string, unknown>;
            if (obj['options'] === null || typeof obj['options'] !== 'object') {
              throw new Error('Invalid WebAuthn options payload');
            }
            return { options: obj['options'] as Record<string, unknown> };
          },
        },
      );
    },
    async webauthnLoginVerify(data: {
      credential: Record<string, unknown>;
      sessionKey: string;
    }): Promise<AuthResponse> {
      return request<AuthResponse>(
        '/auth/webauthn/login/verify',
        {
          method: 'POST',
          body: JSON.stringify(data),
        },
        authResponseSchema,
      );
    },
    async listPasskeys(): Promise<PasskeyListItem[]> {
      return request<PasskeyListItem[]>('/users/me/passkeys', undefined, {
        parse(value: unknown): PasskeyListItem[] {
          if (!Array.isArray(value)) {
            throw new Error('Invalid passkey list response');
          }
          return value.map((item) => {
            if (item === null || typeof item !== 'object') {
              throw new Error('Invalid passkey item');
            }
            const obj = item as Record<string, unknown>;
            if (
              typeof obj['id'] !== 'string' ||
              typeof obj['name'] !== 'string' ||
              (obj['deviceType'] !== null && typeof obj['deviceType'] !== 'string') ||
              typeof obj['backedUp'] !== 'boolean' ||
              typeof obj['createdAt'] !== 'string' ||
              (obj['lastUsedAt'] !== null && typeof obj['lastUsedAt'] !== 'string')
            ) {
              throw new Error('Invalid passkey item fields');
            }
            return {
              id: obj['id'],
              name: obj['name'],
              deviceType: obj['deviceType'],
              backedUp: obj['backedUp'],
              createdAt: obj['createdAt'],
              lastUsedAt: obj['lastUsedAt'],
            };
          });
        },
      });
    },
    async renamePasskey(id: string, name: string): Promise<{ message: string }> {
      return request<{ message: string }>(
        `/users/me/passkeys/${id}`,
        {
          method: 'PATCH',
          body: JSON.stringify({ name }),
        },
        totpVerifyResponseSchema,
      );
    },
    async deletePasskey(id: string): Promise<{ message: string }> {
      return request<{ message: string }>(
        `/users/me/passkeys/${id}/delete`,
        {
          method: 'DELETE',
        },
        totpVerifyResponseSchema,
      );
    },
  };
}
