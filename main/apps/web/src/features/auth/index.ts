// main/apps/web/src/features/auth/index.ts
// Auth feature - authentication and authorization

// Components
export {
  AuthForm,
  AuthModal,
  ForgotPasswordForm,
  LoginForm,
  MagicLinkForm,
  NewDeviceBanner,
  OAuthButtons,
  RegisterForm,
  ResetPasswordForm,
  SmsChallenge,
  TosAcceptanceModal,
  TurnstileWidget,
} from './components';
export type {
  AuthFormProps,
  ForgotPasswordFormProps,
  LoginFormProps,
  MagicLinkFormProps,
  OAuthButtonsProps,
  RegisterFormProps,
  ResetPasswordFormProps,
  TosAcceptanceModalProps,
  TurnstileWidgetProps,
} from './components';

// Hooks
export { useAuth, useLoginWithPasskey, usePasskeys, useRegisterPasskey } from './hooks';
export type { AuthContextType, LoginWithPasskeyState, PasskeysState, RegisterPasskeyState } from './hooks';

// Note: useAuthModeNavigation, AuthMode, createFormHandler should be imported directly from @bslt/ui

// Pages
export {
  AuthPage,
  ConfirmEmailChangePage,
  ConfirmEmailPage,
  ConnectedAccountsPage,
  LoginPage,
  MagicLinkVerifyPage,
  RegisterPage,
  ResetPasswordPage,
  RevertEmailChangePage,
} from './pages';

// Services
export { AuthService, createAuthService, TotpChallengeError } from './services';
export type { AuthState } from './services';

// External Types
export type { User } from '@bslt/api';
