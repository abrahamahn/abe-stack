// apps/web/src/features/auth/index.ts
// Auth feature - authentication and authorization
export { ProtectedRoute } from './components';
// eslint-disable-next-line @typescript-eslint/no-deprecated
export { AuthContext, AuthProvider, type AuthContextType } from './contexts';
export { useAuth } from './hooks';
export { LoginPage, RegisterPage } from './pages';
export { AuthService, createAuthService } from './services';
export type { AuthState, User } from './services';

