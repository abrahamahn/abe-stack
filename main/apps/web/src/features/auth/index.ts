// main/apps/web/src/features/auth/index.ts
// Auth feature - authentication and authorization

// Components
export { AuthForm, type AuthFormProps } from './components/AuthForms';
export { AuthModal } from './components/AuthModal';
export { ForgotPasswordForm, type ForgotPasswordFormProps } from './components/ForgotPasswordForm';
export { LoginForm, type LoginFormProps } from './components/LoginForm';
export { MagicLinkForm, type MagicLinkFormProps } from './components/MagicLinkForm';
export { NewDeviceBanner } from './components/NewDeviceBanner';
export { OAuthButtons, type OAuthButtonsProps } from './components/OAuthButtons';
export { RegisterForm, type RegisterFormProps } from './components/RegisterForm';
export { ResetPasswordForm, type ResetPasswordFormProps } from './components/ResetPasswordForm';
export { SmsChallenge } from './components/SmsChallenge';
export { TosAcceptanceModal, type TosAcceptanceModalProps } from './components/TosAcceptanceModal';
export { TurnstileWidget, type TurnstileWidgetProps } from './components/TurnstileWidget';

// Hooks
export { useAuth, type AuthContextType } from './hooks/useAuth';
export {
  useLoginWithPasskey,
  usePasskeys,
  useRegisterPasskey,
  type LoginWithPasskeyState,
  type PasskeysState,
  type RegisterPasskeyState,
} from './hooks/useWebauthn';

// Note: useAuthModeNavigation, AuthMode, createFormHandler should be imported directly from @abe-stack/ui

// Pages
export { AuthPage } from './pages/AuthPage';
export { ConfirmEmailChangePage } from './pages/ConfirmEmailChangePage';
export { ConfirmEmailPage } from './pages/ConfirmEmailPage';
export { ConnectedAccountsPage } from './pages/ConnectedAccountsPage';
export { LoginPage } from './pages/LoginPage';
export { MagicLinkVerifyPage } from './pages/MagicLinkVerifyPage';
export { RegisterPage } from './pages/RegisterPage';
export { ResetPasswordPage } from './pages/ResetPasswordPage';
export { RevertEmailChangePage } from './pages/RevertEmailChangePage';

// Services
export {
  AuthService,
  TotpChallengeError,
  createAuthService,
  type AuthState,
} from './services/AuthService';

// External Types
export type { User } from '@abe-stack/api';
