// src/apps/web/src/api/auth/route.ts
import type {
  ApiClient,
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
  TotpLoginChallengeResponse,
  User,
} from '@abe-stack/api';

export interface AuthRouteClient {
  login: (credentials: LoginRequest) => Promise<AuthResponse | TotpLoginChallengeResponse>;
  totpVerifyLogin: (args: { challengeToken: string; code: string }) => Promise<AuthResponse>;
  register: (data: RegisterRequest) => Promise<RegisterResponse>;
  logout: () => Promise<unknown>;
  refresh: () => Promise<unknown>;
  getCurrentUser: () => Promise<User>;
  forgotPassword: (data: ForgotPasswordRequest) => Promise<ForgotPasswordResponse>;
  resetPassword: (data: ResetPasswordRequest) => Promise<ResetPasswordResponse>;
  verifyEmail: (data: EmailVerificationRequest) => Promise<EmailVerificationResponse>;
  resendVerification: (data: ResendVerificationRequest) => Promise<ResendVerificationResponse>;
}

export const createAuthRoute = (api: ApiClient): AuthRouteClient => ({
  login: (credentials) => api.login(credentials),
  totpVerifyLogin: (args) => api.totpVerifyLogin(args),
  register: (data) => api.register(data),
  logout: () => api.logout(),
  refresh: () => api.refresh(),
  getCurrentUser: () => api.getCurrentUser(),
  forgotPassword: (data) => api.forgotPassword(data),
  resetPassword: (data) => api.resetPassword(data),
  verifyEmail: (data) => api.verifyEmail(data),
  resendVerification: (data) => api.resendVerification(data),
});
