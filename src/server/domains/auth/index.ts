// src/server/domains/auth/index.ts

// Export auth API functions
export * from './api/auth';

// Export auth middleware
export { authenticate, authorize } from './middleware/auth';
export { authenticateJWT } from './middleware/authenticateJWT';

// Export auth services
export { AuthService } from './services/AuthService';
export { AuthTokenService, TokenType } from './services/AuthTokenService';

// Export auth errors
export { UnauthorizedError } from './errors/UnauthorizedError'; 