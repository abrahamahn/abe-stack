// apps/web/src/features/auth/index.ts
// Auth feature - authentication and authorization
export {
  AuthForm,
  AuthModal,
  LoginForm,
  ProtectedRoute,
  RegisterForm,
  ForgotPasswordForm,
  ResetPasswordForm,
} from './components';
export { useAuth, useResendCooldown, type AuthContextType } from './hooks';
// Note: useAuthModeNavigation, AuthMode should be imported directly from @abe-stack/ui
export { createFormHandler, type FormHandlerOptions } from './utils';
export {
  AuthPage,
  ConfirmEmailPage,
  ConnectedAccountsPage,
  LoginPage,
  RegisterPage,
  ResetPasswordPage,
} from './pages';
export { AuthService, createAuthService } from './services';
export type { AuthState, User } from './services';
