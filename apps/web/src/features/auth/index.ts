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
export {
  useAuth,
  useAuthModeNavigation,
  type AuthContextType,
  type AuthModeNavigation,
  type AuthModeNavigationOptions,
} from './hooks';
// Re-export AuthMode from UI for convenience
export type { AuthMode } from '@abe-stack/ui';
export { createFormHandler, type FormHandlerOptions } from './utils';
export { AuthPage, ConfirmEmailPage, LoginPage, RegisterPage, ResetPasswordPage } from './pages';
export { AuthService, createAuthService } from './services';
export type { AuthState, User } from './services';
