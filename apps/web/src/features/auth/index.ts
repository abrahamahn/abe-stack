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
// eslint-disable-next-line @typescript-eslint/no-deprecated
export { AuthContext, AuthProvider, type AuthContextType } from './contexts';
export { useAuth } from './hooks';
export { AuthPage, ConfirmEmailPage, LoginPage, RegisterPage, ResetPasswordPage } from './pages';
export { AuthService, createAuthService } from './services';
export type { AuthState, User } from './services';
