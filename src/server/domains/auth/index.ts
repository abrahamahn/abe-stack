// src/server/domains/auth/index.ts

// Export auth API functions
export * from './api/auth-api';

// Export auth middleware
export { authenticate, authorize } from './middleware/auth.middleware';
export { authenticateJWT } from './middleware/authJWT.middleware';

// Export auth services
export { AuthService } from './services/auth.service';
export { AuthTokenService, TokenType } from './services/auth-token.service';

// Export auth errors
export { UnauthorizedError } from './errors/unauthorized.error'; 