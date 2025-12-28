Now let me provide a comprehensive summary of what we've covered and what your next steps should be for implementing a production-ready authentication system.
Summary of Authentication Analysis
After reviewing your existing codebase, I've found that you have a well-structured foundation with models, repositories, and services for authentication, but you're missing several critical components for a complete implementation:
What You Already Have:

Domain Models: User, Role, Permission, Token, and other related models
Repositories: Data access layer for auth entities with error handling
Service Interfaces: Basic service definitions for auth operations
Security Utilities: Password hashing, validation, and token management

What You Need to Implement:

Database Migrations:

Create SQL migration scripts to set up all auth-related tables
Implement the database schema design found in the PostgreSQLIndexingStrategy

API Layer:

Controllers for handling auth requests
RESTful endpoints for registration, login, password reset, etc.
Input validation and error handling

Middleware:

Authentication middleware for protecting routes
Role-based authorization middleware
CSRF protection
Security headers

Email Workflows:

Email verification process
Password reset flow
Email templates

MFA Implementation:

Complete the multi-factor authentication flow
QR code generation for authenticator apps
MFA verification endpoints

Session Management:

Session tracking and storage
Session termination functionality
Cross-device session management

Next Steps
I recommend starting with these immediate steps:

Create Database Migrations:

Use the SQL schema I provided to create migration files
Run migrations to set up your database structure

Implement Auth Controllers and Routes:

Create the AuthController with all required endpoints
Set up the auth routes in your Express app

Create the Auth Middleware:

Implement the JWT verification middleware
Add the role-based access control

Complete Email Verification:

Set up email templates
Implement the verification workflow

Add Unit and Integration Tests:

Create tests for all auth operations
Set up test data fixtures

The detailed implementation plan includes ready-to-use code snippets, configuration examples, and best practices that you can directly incorporate into your application.
Security Considerations
Make sure you follow these critical security practices:

Use HTTPS in production
Store secrets in environment variables
Implement rate limiting for all auth endpoints
Use proper password hashing with bcrypt
Apply short-lived JWT tokens with refresh token rotation
Log all authentication events for audit purposes
Regularly scan for vulnerabilities in dependencies

Your authentication framework is architecturally sound, but the implementation gaps need to be addressed to create a production-ready system. The implementation plan I've provided gives you all the components you need to complete this task.

```

## 14. Production Considerations and Deployment

### Environment Variables

Create a `.env` file template with all required environment variables:

```

# Server Configuration

PORT=3000
NODE_ENV=development
API_URL=http://localhost:3000
CLIENT_URL=http://localhost:8080

# Security

JWT_SECRET=your-jwt-secret-key
JWT_REFRESH_SECRET=your-jwt-refresh-secret-key
JWT_AUDIENCE=your-app-audience
JWT_ISSUER=your-app-issuer
PASSWORD_PEPPER=your-password-pepper

# Password Policy

PASSWORD_MIN_LENGTH=12
PASSWORD_MAX_LENGTH=128
PASSWORD_REQUIRE_UPPERCASE=true
PASSWORD_REQUIRE_LOWERCASE=true
PASSWORD_REQUIRE_NUMBERS=true
PASSWORD_REQUIRE_SPECIAL=true
PASSWORD_PREVENT_COMMON=true
PASSWORD_PREVENT_PERSONAL=true
PASSWORD_PREVENT_PWNED=true
PASSWORD_PREVENT_REUSE=5
PASSWORD_MIN_AGE=1
PASSWORD_MAX_AGE=90

# Email Verification

EMAIL_VERIFICATION_EXPIRY=24
EMAIL_VERIFICATION_MAX_ATTEMPTS=5
EMAIL_VERIFICATION_TIME_WINDOW=60
EMAIL_VERIFICATION_RESEND_COOLDOWN=5

# Rate Limiting

RATE_LIMIT_LOGIN_MAX=5
RATE_LIMIT_LOGIN_WINDOW=60
RATE_LIMIT_RESET_MAX=3
RATE_LIMIT_RESET_WINDOW=60
RATE_LIMIT_VERIFY_MAX=3
RATE_LIMIT_VERIFY_WINDOW=60

# Database

POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=auth_db
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_SSL=false
POSTGRES_POOL_MIN=2
POSTGRES_POOL_MAX=10
POSTGRES_QUERY_TIMEOUT_MS=30000
POSTGRES_HEALTH_CHECK_INTERVAL_MS=30000
POSTGRES_READ_REPLICAS_ENABLED=false

# Redis

REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=
REDIS_DB=0

# Email

SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-smtp-username
SMTP_PASSWORD=your-smtp-password
EMAIL_FROM=no-reply@yourapp.com
EMAIL_TEMPLATE_PATH=./templates/email

````

### Docker Deployment

Create a Docker Compose file for production deployment:

```yaml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    restart: always
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
      - POSTGRES_HOST=postgres
      - POSTGRES_PORT=5432
      - POSTGRES_DB=${POSTGRES_DB}
      - POSTGRES_USER=${POSTGRES_USER}
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
      - JWT_SECRET=${JWT_SECRET}
      - JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
      - REDIS_URL=redis://redis:6379
    depends_on:
      - postgres
      - redis
    networks:
      - app-network

  postgres:
    image: postgres:13
    restart: always
    environment:
      - POSTGRES_DB=${POSTGRES_DB}
      - POSTGRES_USER=${POSTGRES_USER}
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
    volumes:
      - postgres-data:/var/lib/postgresql/data
      - ./init-scripts:/docker-entrypoint-initdb.d
    networks:
      - app-network

  redis:
    image: redis:6
    restart: always
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis-data:/data
    networks:
      - app-network

  adminer:
    image: adminer
    restart: always
    ports:
      - "8080:8080"
    networks:
      - app-network

networks:
  app-network:
    driver: bridge

volumes:
  postgres-data:
  redis-data:
````

### Production Security Checklist

Make sure to implement these security practices for production:

1. **Secure Connection**: Use HTTPS in production with proper SSL/TLS certificates
2. **Password Storage**: Use strong hashing (bcrypt) with salt and pepper
3. **JWT Security**:
   - Short-lived access tokens (15 min)
   - Separate refresh tokens
   - Secure storage (HTTP-only cookies for refresh tokens)
4. **Rate Limiting**: Apply rate limits to all auth endpoints
5. **Brute Force Protection**: Account lockout after multiple failed attempts
6. **MFA**: Multi-factor authentication support
7. **CSRF Protection**: Implement protection for session-based auth
8. **User Verification**: Email verification for new accounts
9. **Activity Logging**: Log all authentication activities
10. **Secure Headers**: Use security headers (CSP, HSTS, etc.)
11. **Session Management**:
    - Secure session storage
    - Session timeouts
    - Ability to view and revoke sessions
12. **Role-Based Access Control**: Implement proper permission checks
13. **Input Validation**: Validate all inputs on server-side
14. **Sensitive Data Exposure**: Minimize exposure of sensitive information
15. **Password Reset**: Secure password reset flow with limited-time tokens
16. **Database Security**: Least privilege database users
17. **Environment Variables**: Store secrets in environment variables or secret manager
18. **Regular Updates**: Keep all dependencies updated
19. **Error Handling**: Don't expose error details to clients
20. **Audit Logging**: Log sensitive operations for audit purposes

## 15. Monitoring and Logging

Implement comprehensive logging for authentication events:

```typescript
import winston from 'winston';
import { Request, Response, NextFunction } from 'express';

// Create a structured logger for auth events
const authLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  defaultMeta: { service: 'auth-service' },
  transports: [
    new winston.transports.File({
      filename: 'logs/auth-error.log',
      level: 'error',
    }),
    new winston.transports.File({ filename: 'logs/auth.log' }),
  ],
});

// Add console output during development
if (process.env.NODE_ENV !== 'production') {
  authLogger.add(
    new winston.transports.Console({
      format: winston.format.combine(winston.format.colorize(), winston.format.simple()),
    }),
  );
}

// Auth event middleware
export const authEventLogger = (req: Request, res: Response, next: NextFunction) => {
  // Capture original end method
  const originalEnd = res.end;

  // Override end method
  res.end = function (chunk?: any, encoding?: BufferEncoding, callback?: Function): any {
    // Capture authenticated user if available
    const userId = (req as any).user?.id || 'anonymous';

    // Log authentication events
    if (req.path.startsWith('/api/auth/')) {
      const eventType = req.path.split('/').pop();
      const status = res.statusCode;
      const ip = req.ip;
      const userAgent = req.headers['user-agent'] || 'unknown';

      let logLevel = 'info';

      // Use error level for failed auth attempts
      if (status >= 400) {
        logLevel = 'error';
      }

      // Log the auth event
      authLogger.log(logLevel, 'Auth event', {
        userId,
        eventType,
        method: req.method,
        path: req.path,
        status,
        ip,
        userAgent,
        timestamp: new Date().toISOString(),
      });
    }

    // Call original end method
    return originalEnd.call(this, chunk, encoding, callback);
  };

  next();
};
```

## Conclusion

This comprehensive implementation plan provides all the components needed for a production-ready authentication system. The architecture follows best practices for security, maintainability, and scalability. By implementing these components, you'll have a robust auth system that can be extended as your application grows.

Key features of this implementation:

1. **Secure User Authentication**: Password hashing, rate limiting, and brute force protection
2. **Multi-Factor Authentication**: Complete MFA support with TOTP
3. **Email Verification**: Verification workflow for new accounts
4. **Password Reset**: Secure password reset flow
5. **Session Management**: View and manage active sessions
6. **Role-Based Access Control**: Permission management
7. **JWT Authentication**: Secure token management with refresh tokens
8. **Comprehensive API**: RESTful endpoints for all auth operations
9. **Frontend Integration**: React components for auth flows
10. **Security Best Practices**: CSRF protection, security headers, etc.
11. **Rate Limiting**: Protection against abuse
12. \*\*Testing# Authentication System Implementation Plan

## 1. Database Migrations

Create migration files to establish the schema for all auth-related tables:

```sql
-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username VARCHAR(100) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL UNIQUE,
  password TEXT NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'user',
  is_verified BOOLEAN NOT NULL DEFAULT false,
  email_confirmed BOOLEAN NOT NULL DEFAULT false,
  email_token TEXT,
  email_token_expire TIMESTAMP,
  last_email_sent TIMESTAMP,
  type VARCHAR(20) NOT NULL DEFAULT 'standard',
  last_login_at TIMESTAMP,
  account_status VARCHAR(20) NOT NULL DEFAULT 'pending',
  failed_login_attempts INTEGER NOT NULL DEFAULT 0,
  password_last_changed TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create roles table
CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(50) NOT NULL UNIQUE,
  description TEXT,
  inherits_from UUID REFERENCES roles(id),
  is_system BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create permissions table
CREATE TABLE IF NOT EXISTS permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  resource VARCHAR(100) NOT NULL,
  action VARCHAR(100) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(resource, action)
);

-- Create user_roles junction table
CREATE TABLE IF NOT EXISTS user_roles (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, role_id)
);

-- Create role_permissions junction table
CREATE TABLE IF NOT EXISTS role_permissions (
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  PRIMARY KEY (role_id, permission_id)
);

-- Create tokens table
CREATE TABLE IF NOT EXISTS tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  type VARCHAR(50) NOT NULL,
  device_info JSONB,
  ip_address VARCHAR(45),
  expires_at TIMESTAMP NOT NULL,
  last_used_at TIMESTAMP,
  revoked BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create password_reset_tokens table
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  used_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  display_name VARCHAR(100),
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  bio TEXT,
  profile_image TEXT,
  banner_image TEXT,
  location VARCHAR(100),
  website TEXT,
  social_links JSONB DEFAULT '{}',
  interests TEXT[] DEFAULT '{}',
  skills TEXT[] DEFAULT '{}',
  occupation VARCHAR(100),
  education TEXT,
  birthday DATE,
  phone_number VARCHAR(20),
  last_profile_update TIMESTAMP NOT NULL DEFAULT NOW(),
  profile_completion_percentage INTEGER NOT NULL DEFAULT 0,
  is_public BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create user_preferences table
CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  notifications JSONB NOT NULL DEFAULT '{"emailNotifications":true,"pushNotifications":true}',
  privacy JSONB NOT NULL DEFAULT '{"profileVisibility":"public"}',
  theme JSONB NOT NULL DEFAULT '{"theme":"system"}',
  accessibility JSONB NOT NULL DEFAULT '{}',
  language VARCHAR(10) NOT NULL DEFAULT 'en',
  timezone VARCHAR(50) NOT NULL DEFAULT 'UTC',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create user_connections table
CREATE TABLE IF NOT EXISTS user_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, target_user_id, type)
);

-- Add indexes based on your PostgreSQLIndexingStrategy
-- Include indexes from UserIndexingStrategy, etc.
```

## 2. API Controllers and Routes

Create controllers and routes for auth operations:

### AuthController.ts

```typescript
import { Request, Response, NextFunction } from 'express';
import { AuthService } from '@services/core/auth/AuthService';
import { container } from '@server/infrastructure/di/container';
import TYPES from '@server/infrastructure/di/types';

export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = container.get<AuthService>(TYPES.AuthService);
  }

  // Register a new user
  public async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { username, email, password, firstName, lastName } = req.body;

      const deviceInfo = {
        ip: req.ip,
        userAgent: req.headers['user-agent'] || '',
        deviceId: req.body.deviceId,
      };

      const result = await this.authService.register(
        { username, email, password, firstName, lastName },
        deviceInfo,
      );

      res.status(201).json({
        message: 'User registered successfully',
        user: result.user,
        token: result.token,
        refreshToken: result.refreshToken,
      });
    } catch (error) {
      next(error);
    }
  }

  // Login user
  public async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password, mfaToken } = req.body;

      const deviceInfo = {
        ip: req.ip,
        userAgent: req.headers['user-agent'] || '',
        deviceId: req.body.deviceId,
      };

      const result = await this.authService.login({ email, password, mfaToken }, deviceInfo);

      res.json({
        message: 'Login successful',
        user: result.user,
        token: result.token,
        refreshToken: result.refreshToken,
        requiresMFA: result.requiresMFA,
        tempToken: result.tempToken,
      });
    } catch (error) {
      next(error);
    }
  }

  // Refresh access token
  public async refreshToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { refreshToken } = req.body;
      const result = await this.authService.refreshToken(refreshToken);

      res.json({
        token: result.token,
      });
    } catch (error) {
      next(error);
    }
  }

  // Setup MFA
  public async setupMFA(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user.id; // From auth middleware
      const result = await this.authService.setupMFA(userId);

      res.json({
        secret: result.secret,
        qrCode: result.qrCode,
      });
    } catch (error) {
      next(error);
    }
  }

  // Verify and enable MFA
  public async verifyMFA(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user.id; // From auth middleware
      const { token } = req.body;

      const result = await this.authService.verifyAndEnableMFA(userId, token);

      res.json({
        success: result,
        message: 'MFA enabled successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  // Disable MFA
  public async disableMFA(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user.id; // From auth middleware
      const { token } = req.body;

      const result = await this.authService.disableMFA(userId, token);

      res.json({
        success: result,
        message: 'MFA disabled successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  // Request password reset
  public async requestPasswordReset(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { email } = req.body;
      await this.authService.requestPasswordReset({ email });

      // Always return success, even if email not found (security best practice)
      res.json({
        message: 'If your email exists in our system, you will receive a password reset link',
      });
    } catch (error) {
      next(error);
    }
  }

  // Reset password with token
  public async resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { token, newPassword } = req.body;
      await this.authService.resetPassword({ token, newPassword });

      res.json({
        message: 'Password reset successful',
      });
    } catch (error) {
      next(error);
    }
  }

  // Verify email
  public async verifyEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { token } = req.query;

      if (!token || typeof token !== 'string') {
        throw new Error('Invalid token');
      }

      await this.authService.verifyEmail({ token });

      res.json({
        message: 'Email verified successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  // Get user sessions
  public async getUserSessions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user.id; // From auth middleware
      const sessions = await this.authService.getUserSessions(userId);

      res.json({
        sessions,
      });
    } catch (error) {
      next(error);
    }
  }

  // Terminate session
  public async terminateSession(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user.id; // From auth middleware
      const { sessionId } = req.params;

      const result = await this.authService.terminateSession(userId, sessionId);

      res.json({
        success: result,
        message: 'Session terminated successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  // Terminate all other sessions
  public async terminateOtherSessions(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const userId = req.user.id; // From auth middleware
      const currentSessionId = req.user.sessionId; // From auth middleware

      const result = await this.authService.terminateOtherSessions(userId, currentSessionId);

      res.json({
        success: result,
        message: 'All other sessions terminated successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}
```

### Auth Routes

```typescript
import { Router } from 'express';
import { AuthController } from '@controllers/AuthController';
import { authMiddleware } from '@middleware/authMiddleware';

const router = Router();
const authController = new AuthController();

// Public routes
router.post('/register', authController.register.bind(authController));
router.post('/login', authController.login.bind(authController));
router.post('/refresh-token', authController.refreshToken.bind(authController));
router.post('/request-password-reset', authController.requestPasswordReset.bind(authController));
router.post('/reset-password', authController.resetPassword.bind(authController));
router.get('/verify-email', authController.verifyEmail.bind(authController));

// Protected routes (require authentication)
router.get('/sessions', authMiddleware, authController.getUserSessions.bind(authController));
router.delete(
  '/sessions/:sessionId',
  authMiddleware,
  authController.terminateSession.bind(authController),
);
router.delete(
  '/sessions',
  authMiddleware,
  authController.terminateOtherSessions.bind(authController),
);
router.post('/mfa/setup', authMiddleware, authController.setupMFA.bind(authController));
router.post('/mfa/verify', authMiddleware, authController.verifyMFA.bind(authController));
router.post('/mfa/disable', authMiddleware, authController.disableMFA.bind(authController));

export default router;
```

## 3. Auth Middleware

Create middleware for authentication and authorization:

```typescript
import { Request, Response, NextFunction } from 'express';
import { TokenService } from '@services/core/auth/TokenService';
import { container } from '@server/infrastructure/di/container';
import TYPES from '@server/infrastructure/di/types';
import { UnauthorizedError } from '@services/shared';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    sessionId: string;
  };
}

export const authMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    // Get the token from the Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('No token provided');
    }

    const token = authHeader.split(' ')[1];

    // Verify the token
    const tokenService = container.get<TokenService>(TYPES.TokenService);
    const decoded = tokenService.verifyToken(token);

    // Set the user information in the request
    req.user = {
      id: decoded.userId,
      email: decoded.email,
      role: decoded.role,
      sessionId: decoded.sessionId,
    };

    next();
  } catch (error) {
    next(new UnauthorizedError('Invalid or expired token'));
  }
};

// Optional: Create role-based authorization middleware
export const requireRole = (roles: string | string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      const allowedRoles = Array.isArray(roles) ? roles : [roles];

      if (!allowedRoles.includes(req.user.role)) {
        throw new UnauthorizedError(`Required role: ${allowedRoles.join(' or ')}`);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};
```

## 4. Dependency Injection Setup

Make sure auth services are registered in your DI container:

```typescript
// Update in your container.ts file
import { Container } from 'inversify';
import TYPES from './types';

// Auth Services
import { AuthService } from '@services/core/auth/AuthService';
import { TokenService } from '@services/core/auth/TokenService';
import { PasswordService } from '@services/core/auth/PasswordService';
import { EmailVerificationService } from '@services/core/auth/EmailVerificationService';
import { MFAService } from '@services/core/auth/MFAService';
import { RolePermissionService } from '@services/core/auth/RolePermissionService';

// Repositories
import { UserRepository, userRepository } from '@repositories/auth/UserRepository';
import { RoleRepository, roleRepository } from '@repositories/auth/RoleRepository';
import {
  PermissionRepository,
  permissionRepository,
} from '@repositories/auth/PermissionRepository';
import { TokenRepository, tokenRepository } from '@repositories/auth/TokenRepository';
import { RolePermissionRepository } from '@repositories/auth/RolePermissionRepository';
import { PasswordResetTokenRepository } from '@repositories/auth/PasswordResetTokenRepository';

const container = new Container();

// Register repositories
container.bind<UserRepository>(TYPES.UserRepository).toConstantValue(userRepository);
container.bind<RoleRepository>(TYPES.RoleRepository).toConstantValue(roleRepository);
container
  .bind<PermissionRepository>(TYPES.PermissionRepository)
  .toConstantValue(permissionRepository);
container.bind<TokenRepository>(TYPES.TokenRepository).toConstantValue(tokenRepository);
container
  .bind<RolePermissionRepository>(TYPES.RolePermissionRepository)
  .toConstantValue(new RolePermissionRepository());
container
  .bind<PasswordResetTokenRepository>(TYPES.PasswordResetTokenRepository)
  .toConstantValue(new PasswordResetTokenRepository());

// Register auth services
container.bind<PasswordService>(TYPES.PasswordService).to(PasswordService).inSingletonScope();
container.bind<TokenService>(TYPES.TokenService).to(TokenService).inSingletonScope();
container.bind<MFAService>(TYPES.MFAService).to(MFAService).inSingletonScope();
container
  .bind<EmailVerificationService>(TYPES.EmailVerificationService)
  .to(EmailVerificationService)
  .inSingletonScope();
container.bind<AuthService>(TYPES.AuthService).to(AuthService).inSingletonScope();
container
  .bind<RolePermissionService>(TYPES.RolePermissionService)
  .to(RolePermissionService)
  .inSingletonScope();

export { container };
```

## 5. Error Handler Middleware

Implement a proper error handler middleware:

```typescript
import { Request, Response, NextFunction } from 'express';
import {
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ConflictError,
  TooManyRequestsError,
} from '@services/shared';

export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction): void => {
  console.error('Error:', err);

  // Handle specific error types
  if (err instanceof ValidationError) {
    res.status(400).json({
      error: 'Validation Error',
      message: err.message,
      details: err.details,
    });
    return;
  }

  if (err instanceof NotFoundError) {
    res.status(404).json({
      error: 'Not Found',
      message: err.message,
    });
    return;
  }

  if (err instanceof UnauthorizedError) {
    res.status(401).json({
      error: 'Unauthorized',
      message: err.message,
    });
    return;
  }

  if (err instanceof ConflictError) {
    res.status(409).json({
      error: 'Conflict',
      message: err.message,
    });
    return;
  }

  if (err instanceof TooManyRequestsError) {
    res.status(429).json({
      error: 'Too Many Requests',
      message: err.message,
    });
    return;
  }

  // Default to 500 internal server error
  res.status(500).json({
    error: 'Internal Server Error',
    message: 'An unexpected error occurred',
  });
};
```

## 6. Unit Tests

Create unit tests for auth components:

### AuthService.test.ts

```typescript
import { AuthService } from '@services/core/auth/AuthService';
import { TokenService } from '@services/core/auth/TokenService';
import { PasswordService } from '@services/core/auth/PasswordService';
import { EmailVerificationService } from '@services/core/auth/EmailVerificationService';
import { MFAService } from '@services/core/auth/MFAService';
import { UserRepository } from '@repositories/auth/UserRepository';
import { UnauthorizedError, DuplicateResourceError } from '@services/shared';
import { User } from '@models/auth/User';

// Mock dependencies
jest.mock('@repositories/auth/UserRepository');
jest.mock('@services/core/auth/TokenService');
jest.mock('@services/core/auth/PasswordService');
jest.mock('@services/core/auth/EmailVerificationService');
jest.mock('@services/core/auth/MFAService');

describe('AuthService', () => {
  let authService: AuthService;
  let userRepository: jest.Mocked<UserRepository>;
  let tokenService: jest.Mocked<TokenService>;
  let passwordService: jest.Mocked<PasswordService>;
  let emailVerificationService: jest.Mocked<EmailVerificationService>;
  let mfaService: jest.Mocked<MFAService>;

  beforeEach(() => {
    userRepository = new UserRepository() as jest.Mocked<UserRepository>;
    tokenService = new TokenService(null as any) as jest.Mocked<TokenService>;
    passwordService = new PasswordService() as jest.Mocked<PasswordService>;
    emailVerificationService = new EmailVerificationService(
      null as any,
      null as any,
      null as any,
    ) as jest.Mocked<EmailVerificationService>;
    mfaService = new MFAService() as jest.Mocked<MFAService>;

    authService = new AuthService(
      userRepository,
      tokenService,
      passwordService,
      emailVerificationService,
      mfaService,
    );
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      // Setup
      const registerData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'Password123!',
      };

      const deviceInfo = {
        ip: '127.0.0.1',
        userAgent: 'jest-test',
      };

      const hashedPassword = 'hashedpassword';
      const user = new User({
        ...registerData,
        password: hashedPassword,
        id: 'user-id',
      });

      const token = 'access-token';
      const refreshToken = 'refresh-token';
      const verificationToken = 'verification-token';

      // Mock implementations
      userRepository.findByEmail.mockResolvedValue(null);
      passwordService.hashPassword.mockResolvedValue(hashedPassword);
      userRepository.createWithHashedPassword.mockResolvedValue(user);
      emailVerificationService.generateVerificationToken.mockResolvedValue(verificationToken);
      emailVerificationService.sendVerificationEmail.mockResolvedValue();
      tokenService.generateToken.mockReturnValue(token);
      tokenService.generateRefreshToken.mockReturnValue(refreshToken);

      // Execute
      const result = await authService.register(registerData, deviceInfo);

      // Verify
      expect(userRepository.findByEmail).toHaveBeenCalledWith(registerData.email);
      expect(passwordService.hashPassword).toHaveBeenCalledWith(registerData.password);
      expect(userRepository.createWithHashedPassword).toHaveBeenCalled();
      expect(emailVerificationService.generateVerificationToken).toHaveBeenCalledWith(user);
      expect(emailVerificationService.sendVerificationEmail).toHaveBeenCalledWith(
        user,
        verificationToken,
      );
      expect(tokenService.generateToken).toHaveBeenCalled();
      expect(tokenService.generateRefreshToken).toHaveBeenCalled();

      expect(result).toEqual({
        user,
        token,
        refreshToken,
        requiresMFA: false,
        sessionId: expect.any(String),
      });
    });

    it('should throw DuplicateResourceError if email already exists', async () => {
      // Setup
      const registerData = {
        username: 'testuser',
        email: 'existing@example.com',
        password: 'Password123!',
      };

      const deviceInfo = {
        ip: '127.0.0.1',
        userAgent: 'jest-test',
      };

      const existingUser = new User({
        ...registerData,
        id: 'existing-id',
      });

      // Mock implementations
      userRepository.findByEmail.mockResolvedValue(existingUser);

      // Execute & Verify
      await expect(authService.register(registerData, deviceInfo)).rejects.toThrow(
        DuplicateResourceError,
      );
    });
  });

  describe('login', () => {
    it('should login user successfully', async () => {
      // Setup
      const loginData = {
        email: 'test@example.com',
        password: 'Password123!',
      };

      const deviceInfo = {
        ip: '127.0.0.1',
        userAgent: 'jest-test',
      };

      const user = new User({
        email: loginData.email,
        password: 'hashedpassword',
        id: 'user-id',
      });

      const token = 'access-token';
      const refreshToken = 'refresh-token';

      // Mock implementations
      userRepository.findByEmail.mockResolvedValue(user);
      passwordService.comparePassword.mockResolvedValue(true);
      tokenService.generateToken.mockReturnValue(token);
      tokenService.generateRefreshToken.mockReturnValue(refreshToken);

      // Execute
      const result = await authService.login(loginData, deviceInfo);

      // Verify
      expect(userRepository.findByEmail).toHaveBeenCalledWith(loginData.email);
      expect(passwordService.comparePassword).toHaveBeenCalledWith(
        loginData.password,
        user.password,
      );
      expect(tokenService.generateToken).toHaveBeenCalled();
      expect(tokenService.generateRefreshToken).toHaveBeenCalled();

      expect(result).toEqual({
        user,
        token,
        refreshToken,
        requiresMFA: false,
        sessionId: expect.any(String),
      });
    });

    it('should throw UnauthorizedError if user not found', async () => {
      // Setup
      const loginData = {
        email: 'nonexistent@example.com',
        password: 'Password123!',
      };

      const deviceInfo = {
        ip: '127.0.0.1',
        userAgent: 'jest-test',
      };

      // Mock implementations
      userRepository.findByEmail.mockResolvedValue(null);

      // Execute & Verify
      await expect(authService.login(loginData, deviceInfo)).rejects.toThrow(UnauthorizedError);
    });

    it('should throw UnauthorizedError if password is incorrect', async () => {
      // Setup
      const loginData = {
        email: 'test@example.com',
        password: 'WrongPassword123!',
      };

      const deviceInfo = {
        ip: '127.0.0.1',
        userAgent: 'jest-test',
      };

      const user = new User({
        email: loginData.email,
        password: 'hashedpassword',
        id: 'user-id',
      });

      // Mock implementations
      userRepository.findByEmail.mockResolvedValue(user);
      passwordService.comparePassword.mockResolvedValue(false);

      // Execute & Verify
      await expect(authService.login(loginData, deviceInfo)).rejects.toThrow(UnauthorizedError);
    });
  });

  // Add more tests for other AuthService methods...
});
```

## 7. Integration and E2E Tests

Create integration tests that test the complete auth flow:

```typescript
import request from 'supertest';
import app from '../app'; // Your Express app
import { container } from '@server/infrastructure/di/container';
import { UserRepository } from '@repositories/auth/UserRepository';
import TYPES from '@server/infrastructure/di/types';

describe('Auth API Integration Tests', () => {
  let userRepository: UserRepository;

  beforeAll(() => {
    userRepository = container.get<UserRepository>(TYPES.UserRepository);
  });

  beforeEach(async () => {
    // Clear test data or use a test database
    // await db.truncate(['users', 'tokens', ...]);
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'Password123!',
        firstName: 'Test',
        lastName: 'User',
      };

      const response = await request(app).post('/api/auth/register').send(userData).expect(201);

      expect(response.body).toHaveProperty('message', 'User registered successfully');
      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body.user.email).toBe(userData.email);
      expect(response.body.user.username).toBe(userData.username);
      expect(response.body.user).not.toHaveProperty('password');
    });

    it('should return 400 when required fields are missing', async () => {
      const userData = {
        email: 'test@example.com',
        // Missing username and password
      };

      const response = await request(app).post('/api/auth/register').send(userData).expect(400);

      expect(response.body).toHaveProperty('error', 'Validation Error');
    });

    it('should return 409 when email already exists', async () => {
      // Setup - create a user first
      const userData = {
        username: 'existinguser',
        email: 'existing@example.com',
        password: 'Password123!',
      };

      await userRepository.createWithHashedPassword(userData);

      // Try to register with the same email
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'newuser',
          email: 'existing@example.com',
          password: 'Password123!',
        })
        .expect(409);

      expect(response.body).toHaveProperty('error', 'Conflict');
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      // Create a test user for login tests
      const userData = {
        username: 'loginuser',
        email: 'login@example.com',
        password: 'Password123!',
        emailConfirmed: true,
        accountStatus: 'active',
      };

      // Create the user with the password hash
      await userRepository.createWithHashedPassword(userData);
    });

    it('should login successfully with correct credentials', async () => {
      const loginData = {
        email: 'login@example.com',
        password: 'Password123!',
      };

      const response = await request(app).post('/api/auth/login').send(loginData).expect(200);

      expect(response.body).toHaveProperty('message', 'Login successful');
      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body.user.email).toBe(loginData.email);
    });

    it('should return 401 with incorrect password', async () => {
      const loginData = {
        email: 'login@example.com',
        password: 'WrongPassword123!',
      };

      const response = await request(app).post('/api/auth/login').send(loginData).expect(401);

      expect(response.body).toHaveProperty('error', 'Unauthorized');
    });

    it('should return 401 with non-existent email', async () => {
      const loginData = {
        email: 'nonexistent@example.com',
        password: 'Password123!',
      };

      const response = await request(app).post('/api/auth/login').send(loginData).expect(401);

      expect(response.body).toHaveProperty('error', 'Unauthorized');
    });
  });

  describe('POST /api/auth/refresh-token', () => {
    let refreshToken: string;

    beforeEach(async () => {
      // Setup - create a user and get a refresh token
      const userData = {
        username: 'refreshuser',
        email: 'refresh@example.com',
        password: 'Password123!',
        emailConfirmed: true,
        accountStatus: 'active',
      };

      await userRepository.createWithHashedPassword(userData);

      const loginResponse = await request(app).post('/api/auth/login').send({
        email: 'refresh@example.com',
        password: 'Password123!',
      });

      refreshToken = loginResponse.body.refreshToken;
    });

    it('should refresh token successfully', async () => {
      const response = await request(app)
        .post('/api/auth/refresh-token')
        .send({ refreshToken })
        .expect(200);

      expect(response.body).toHaveProperty('token');
    });

    it('should return 401 with invalid refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh-token')
        .send({ refreshToken: 'invalid-token' })
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Unauthorized');
    });
  });

  describe('GET /api/auth/verify-email', () => {
    it('should verify email successfully', async () => {
      // Setup - create a user with verification token
      const userData = {
        username: 'verifyuser',
        email: 'verify@example.com',
        password: 'Password123!',
        emailToken: 'valid-verification-token',
        emailTokenExpire: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours in the future
      };

      await userRepository.createWithHashedPassword(userData);

      const response = await request(app)
        .get('/api/auth/verify-email')
        .query({ token: 'valid-verification-token' })
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Email verified successfully');

      // Verify the user's email is now confirmed
      const user = await userRepository.findByEmail('verify@example.com');
      expect(user?.emailConfirmed).toBe(true);
    });

    it('should return 400 with invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/verify-email')
        .query({ token: 'invalid-token' })
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation Error');
    });
  });

  // Tests for protected routes using auth middleware
  describe('Protected Routes', () => {
    let authToken: string;
    let userId: string;

    beforeEach(async () => {
      // Setup - create a user and get authentication token
      const userData = {
        username: 'protecteduser',
        email: 'protected@example.com',
        password: 'Password123!',
        emailConfirmed: true,
        accountStatus: 'active',
      };

      const user = await userRepository.createWithHashedPassword(userData);
      userId = user.id;

      const loginResponse = await request(app).post('/api/auth/login').send({
        email: 'protected@example.com',
        password: 'Password123!',
      });

      authToken = loginResponse.body.token;
    });

    describe('GET /api/auth/sessions', () => {
      it('should return user sessions when authenticated', async () => {
        const response = await request(app)
          .get('/api/auth/sessions')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('sessions');
        expect(Array.isArray(response.body.sessions)).toBe(true);
      });

      it('should return 401 when not authenticated', async () => {
        const response = await request(app).get('/api/auth/sessions').expect(401);

        expect(response.body).toHaveProperty('error', 'Unauthorized');
      });
    });

    describe('MFA Routes', () => {
      it('should setup MFA when authenticated', async () => {
        const response = await request(app)
          .post('/api/auth/mfa/setup')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('secret');
        expect(response.body).toHaveProperty('qrCode');
      });

      it('should verify MFA when authenticated', async () => {
        // This test requires a valid MFA token, which is hard to generate in a test
        // In a real test, you might mock the MFA service
        // This is just a structural example
        const response = await request(app)
          .post('/api/auth/mfa/verify')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ token: '123456' }) // This would be a valid token in real scenario
          .expect(400); // Expect 400 because the token is invalid

        expect(response.body).toHaveProperty('error');
      });
    });
  });
});
```

## 8. Email Templates

Create email templates for verification and password reset:

### Email Verification Template

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Verify Your Email</title>
    <style>
      body {
        font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
        line-height: 1.6;
        color: #333;
        max-width: 600px;
        margin: 0 auto;
        padding: 20px;
      }
      .container {
        border: 1px solid #e9e9e9;
        border-radius: 5px;
        padding: 20px;
      }
      .header {
        text-align: center;
        margin-bottom: 20px;
      }
      .logo {
        max-width: 150px;
        margin-bottom: 20px;
      }
      .button {
        display: inline-block;
        background-color: #4caf50;
        color: white;
        text-decoration: none;
        padding: 10px 20px;
        border-radius: 4px;
        margin: 20px 0;
      }
      .footer {
        margin-top: 30px;
        font-size: 12px;
        color: #888;
        text-align: center;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <img src="https://yourapp.com/logo.png" alt="Your App Logo" class="logo" />
        <h1>Verify Your Email Address</h1>
      </div>

      <p>Hi {{username}},</p>

      <p>Thanks for signing up! Please verify your email address by clicking the button below:</p>

      <div style="text-align: center;">
        <a href="{{verificationUrl}}" class="button">Verify Email Address</a>
      </div>

      <p>Or copy and paste this link into your browser:</p>

      <p>{{verificationUrl}}</p>

      <p>This link will expire in {{expiryHours}} hours.</p>

      <p>If you didn't create an account, you can safely ignore this email.</p>

      <div class="footer">
        <p>&copy; 2023 Your App. All rights reserved.</p>
        <p>123 App Street, San Francisco, CA 94103</p>
      </div>
    </div>
  </body>
</html>
```

### Password Reset Template

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Reset Your Password</title>
    <style>
      body {
        font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
        line-height: 1.6;
        color: #333;
        max-width: 600px;
        margin: 0 auto;
        padding: 20px;
      }
      .container {
        border: 1px solid #e9e9e9;
        border-radius: 5px;
        padding: 20px;
      }
      .header {
        text-align: center;
        margin-bottom: 20px;
      }
      .logo {
        max-width: 150px;
        margin-bottom: 20px;
      }
      .button {
        display: inline-block;
        background-color: #2196f3;
        color: white;
        text-decoration: none;
        padding: 10px 20px;
        border-radius: 4px;
        margin: 20px 0;
      }
      .footer {
        margin-top: 30px;
        font-size: 12px;
        color: #888;
        text-align: center;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <img src="https://yourapp.com/logo.png" alt="Your App Logo" class="logo" />
        <h1>Reset Your Password</h1>
      </div>

      <p>Hi {{username}},</p>

      <p>
        We received a request to reset your password. Click the button below to create a new
        password:
      </p>

      <div style="text-align: center;">
        <a href="{{resetUrl}}" class="button">Reset Password</a>
      </div>

      <p>Or copy and paste this link into your browser:</p>

      <p>{{resetUrl}}</p>

      <p>This link will expire in {{expiryHours}} hours.</p>

      <p>If you didn't request a password reset, you can safely ignore this email.</p>

      <div class="footer">
        <p>&copy; 2023 Your App. All rights reserved.</p>
        <p>123 App Street, San Francisco, CA 94103</p>
      </div>
    </div>
  </body>
</html>
```

## 9. Frontend Integration (React Example)

Create React components for auth-related features:

### AuthContext.tsx

```tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AuthService } from '../services/AuthService';

interface User {
  id: string;
  username: string;
  email: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string, mfaToken?: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const authService = new AuthService();

  useEffect(() => {
    // Check if user is already logged in
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('token');

        if (token) {
          // Verify token validity or refresh if needed
          const userData = await authService.getCurrentUser();
          setUser(userData);
        }
      } catch (error) {
        // Token invalid - remove from storage
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string, mfaToken?: string) => {
    setIsLoading(true);

    try {
      const result = await authService.login(email, password, mfaToken);

      if (result.requiresMFA) {
        // Handle MFA flow
        localStorage.setItem('tempToken', result.tempToken!);
        throw new Error('MFA_REQUIRED');
      }

      localStorage.setItem('token', result.token);
      localStorage.setItem('refreshToken', result.refreshToken);
      setUser(result.user);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (username: string, email: string, password: string) => {
    setIsLoading(true);

    try {
      const result = await authService.register(username, email, password);
      localStorage.setItem('token', result.token);
      localStorage.setItem('refreshToken', result.refreshToken);
      setUser(result.user);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    setUser(null);
  };

  const refreshToken = async () => {
    const refreshToken = localStorage.getItem('refreshToken');

    if (!refreshToken) {
      return;
    }

    try {
      const result = await authService.refreshToken(refreshToken);
      localStorage.setItem('token', result.token);
    } catch (error) {
      // If refresh fails, log out
      logout();
    }
  };

  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoading,
        login,
        register,
        logout,
        refreshToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
};
```

### LoginForm.tsx

```tsx
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const LoginForm: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mfaToken, setMfaToken] = useState('');
  const [showMfa, setShowMfa] = useState(false);
  const [error, setError] = useState('');
  const { login, isLoading } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      await login(email, password, showMfa ? mfaToken : undefined);
      navigate('/dashboard');
    } catch (error) {
      if (error instanceof Error && error.message === 'MFA_REQUIRED') {
        setShowMfa(true);
      } else {
        setError('Invalid email or password');
      }
    }
  };

  return (
    <div className="login-form">
      <h2>Login</h2>

      {error && <div className="error-message">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="password">Password</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        {showMfa && (
          <div className="form-group">
            <label htmlFor="mfaToken">Verification Code</label>
            <input
              type="text"
              id="mfaToken"
              value={mfaToken}
              onChange={(e) => setMfaToken(e.target.value)}
              placeholder="Enter 6-digit code"
              required
            />
            <small>Enter the verification code from your authenticator app</small>
          </div>
        )}

        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Loading...' : 'Login'}
        </button>
      </form>

      <div className="form-links">
        <a href="/forgot-password">Forgot password?</a>
        <a href="/register">Don't have an account? Register</a>
      </div>
    </div>
  );
};

export default LoginForm;
```

### RegisterForm.tsx

```tsx
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const RegisterForm: React.FC = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const { register, isLoading } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      await register(username, email, password);
      navigate('/email-verification-sent');
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('An error occurred during registration');
      }
    }
  };

  return (
    <div className="register-form">
      <h2>Create an Account</h2>

      {error && <div className="error-message">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="username">Username</label>
          <input
            type="text"
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="password">Password</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <small>
            Password must be at least 8 characters and include uppercase, lowercase, number, and
            special character
          </small>
        </div>

        <div className="form-group">
          <label htmlFor="confirmPassword">Confirm Password</label>
          <input
            type="password"
            id="confirmPassword"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
        </div>

        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Creating Account...' : 'Register'}
        </button>
      </form>

      <div className="form-links">
        <a href="/login">Already have an account? Login</a>
      </div>
    </div>
  );
};

export default RegisterForm;
```

## 10. Documentation

Create API documentation for your auth endpoints:

### Swagger Documentation (OpenAPI)

```yaml
openapi: 3.0.0
info:
  title: Authentication API
  description: API for user authentication and authorization
  version: 1.0.0
servers:
  - url: https://api.yourapp.com/api
paths:
  /auth/register:
    post:
      summary: Register a new user
      tags:
        - Authentication
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - username
                - email
                - password
              properties:
                username:
                  type: string
                  example: johndoe
                email:
                  type: string
                  format: email
                  example: john@example.com
                password:
                  type: string
                  format: password
                  example: Password123!
                firstName:
                  type: string
                  example: John
                lastName:
                  type: string
                  example: Doe
      responses:
        '201':
          description: User registered successfully
          content:
            application/json:
              schema:
                type: object
                properties:
                  message:
                    type: string
                    example: User registered successfully
                  user:
                    $ref: '#/components/schemas/User'
                  token:
                    type: string
                  refreshToken:
                    type: string
        '400':
          $ref: '#/components/responses/BadRequest'
        '409':
          $ref: '#/components/responses/Conflict'
        '500':
          $ref: '#/components/responses/ServerError'

  /auth/login:
    post:
      summary: Login a user
      tags:
        - Authentication
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - email
                - password
              properties:
                email:
                  type: string
                  format: email
                  example: john@example.com
                password:
                  type: string
                  format: password
                  example: Password123!
                mfaToken:
                  type: string
                  description: Required if MFA is enabled
                  example: '123456'
      responses:
        '200':
          description: Login successful
          content:
            application/json:
              schema:
                type: object
                properties:
                  message:
                    type: string
                    example: Login successful
                  user:
                    $ref: '#/components/schemas/User'
                  token:
                    type: string
                  refreshToken:
                    type: string
                  requiresMFA:
                    type: boolean
                  tempToken:
                    type: string
        '401':
          $ref: '#/components/responses/Unauthorized'
        '429':
          $ref: '#/components/responses/TooManyRequests'
        '500':
          $ref: '#/components/responses/ServerError'

  /auth/refresh-token:
    post:
      summary: Refresh access token
      tags:
        - Authentication
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - refreshToken
              properties:
                refreshToken:
                  type: string
      responses:
        '200':
          description: Token refreshed successfully
          content:
            application/json:
              schema:
                type: object
                properties:
                  token:
                    type: string
        '401':
          $ref: '#/components/responses/Unauthorized'
        '500':
          $ref: '#/components/responses/ServerError'

  /auth/verify-email:
    get:
      summary: Verify user email
      tags:
        - Authentication
      parameters:
        - name: token
          in: query
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Email verified successfully
          content:
            application/json:
              schema:
                type: object
                properties:
                  message:
                    type: string
                    example: Email verified successfully
        '400':
          $ref: '#/components/responses/BadRequest'
        '500':
          $ref: '#/components/responses/ServerError'

  /auth/request-password-reset:
    post:
      summary: Request password reset
      tags:
        - Authentication
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - email
              properties:
                email:
                  type: string
                  format: email
      responses:
        '200':
          description: Password reset requested
          content:
            application/json:
              schema:
                type: object
                properties:
                  message:
                    type: string
                    example: If your email exists in our system, you will receive a password reset link
        '429':
          $ref: '#/components/responses/TooManyRequests'
        '500':
          $ref: '#/components/responses/ServerError'

  /auth/reset-password:
    post:
      summary: Reset password with token
      tags:
        - Authentication
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - token
                - newPassword
              properties:
                token:
                  type: string
                newPassword:
                  type: string
                  format: password
      responses:
        '200':
          description: Password reset successful
          content:
            application/json:
              schema:
                type: object
                properties:
                  message:
                    type: string
                    example: Password reset successful
        '400':
          $ref: '#/components/responses/BadRequest'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '500':
          $ref: '#/components/responses/ServerError'

  /auth/sessions:
    get:
      summary: Get user sessions
      tags:
        - Authentication
      security:
        - BearerAuth: []
      responses:
        '200':
          description: User sessions retrieved
          content:
            application/json:
              schema:
                type: object
                properties:
                  sessions:
                    type: array
                    items:
                      $ref: '#/components/schemas/Session'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '500':
          $ref: '#/components/responses/ServerError'
    delete:
      summary: Terminate all other sessions
      tags:
        - Authentication
      security:
        - BearerAuth: []
      responses:
        '200':
          description: All other sessions terminated
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                  message:
                    type: string
                    example: All other sessions terminate
```
