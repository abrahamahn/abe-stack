// apps/web/src/features/auth/index.ts
// Auth feature - authentication and authorization
export { ProtectedRoute } from './components';
export { AuthContext, AuthProvider, type AuthContextType, type User } from './contexts';
export { useAuth } from './hooks';
export { LoginPage, RegisterPage } from './pages';
