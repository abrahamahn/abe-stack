// src/apps/web/src/features/auth/index.ts
// Auth feature - authentication and authorization
export {
  AuthForm,
  AuthModal,
  LoginForm,
  MagicLinkForm,
  RegisterForm,
  ForgotPasswordForm,
  ResetPasswordForm,
} from './components';
export { useAuth, type AuthContextType } from './hooks';
// Note: useAuthModeNavigation, AuthMode, createFormHandler should be imported directly from @abe-stack/ui
export {
  AuthPage,
  ConfirmEmailChangePage,
  ConfirmEmailPage,
  ConnectedAccountsPage,
  LoginPage,
  MagicLinkVerifyPage,
  RegisterPage,
  RevertEmailChangePage,
  ResetPasswordPage,
} from './pages';
export { AuthService, createAuthService } from './services';
export type { AuthState } from './services';
export type { User } from '@abe-stack/api';
