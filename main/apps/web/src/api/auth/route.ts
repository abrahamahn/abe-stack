// main/apps/web/src/api/auth/route.ts
import type {
  ApiClient,
  AuthResponse,
  LoginSuccessResponse,
  EmailVerificationRequest,
  EmailVerificationResponse,
  ForgotPasswordRequest,
  ForgotPasswordResponse,
  LoginRequest,
  MagicLinkRequest,
  MagicLinkRequestResponse,
  MagicLinkVerifyRequest,
  MagicLinkVerifyResponse,
  RegisterRequest,
  RegisterResponse,
  ResendVerificationRequest,
  ResendVerificationResponse,
  ResetPasswordRequest,
  ResetPasswordResponse,
  SmsLoginChallengeResponse,
  TotpLoginChallengeResponse,
  User,
} from '@abe-stack/api';

export interface AuthRouteClient {
  login: (
    credentials: LoginRequest,
  ) => Promise<LoginSuccessResponse | TotpLoginChallengeResponse | SmsLoginChallengeResponse>;
  totpVerifyLogin: (args: { challengeToken: string; code: string }) => Promise<AuthResponse>;
  smsSendCode: (args: { challengeToken: string }) => Promise<{ message: string }>;
  smsVerifyLogin: (args: { challengeToken: string; code: string }) => Promise<AuthResponse>;
  register: (data: RegisterRequest) => Promise<RegisterResponse>;
  logout: () => Promise<unknown>;
  refresh: () => Promise<unknown>;
  getCurrentUser: () => Promise<User>;
  forgotPassword: (data: ForgotPasswordRequest) => Promise<ForgotPasswordResponse>;
  resetPassword: (data: ResetPasswordRequest) => Promise<ResetPasswordResponse>;
  verifyEmail: (data: EmailVerificationRequest) => Promise<EmailVerificationResponse>;
  resendVerification: (data: ResendVerificationRequest) => Promise<ResendVerificationResponse>;
  magicLinkRequest: (data: MagicLinkRequest) => Promise<MagicLinkRequestResponse>;
  magicLinkVerify: (data: MagicLinkVerifyRequest) => Promise<MagicLinkVerifyResponse>;
}

export const createAuthRoute = (api: ApiClient): AuthRouteClient => ({
  login: (credentials) => api.login(credentials),
  totpVerifyLogin: (args) => api.totpVerifyLogin(args),
  smsSendCode: (args) => api.smsSendCode(args),
  smsVerifyLogin: (args) => api.smsVerifyLogin(args),
  register: (data) => api.register(data),
  logout: () => api.logout(),
  refresh: () => api.refresh(),
  getCurrentUser: () => api.getCurrentUser(),
  forgotPassword: (data) => api.forgotPassword(data),
  resetPassword: (data) => api.resetPassword(data),
  verifyEmail: (data) => api.verifyEmail(data),
  resendVerification: (data) => api.resendVerification(data),
  magicLinkRequest: (data) => api.magicLinkRequest(data),
  magicLinkVerify: (data) => api.magicLinkVerify(data),
});
