# Authentication System

This directory contains the authentication system for the application. The auth system provides the following features:

## Features

- User registration and login
- Role-based access control (RBAC)
- Permission management
- JWT tokens for authentication
- Refresh tokens for session management
- Password reset flow
- Email verification
- Multi-factor authentication (MFA)
- User profiles
- User preferences
- User connections (social features)

## Architecture

The authentication system follows a clean architecture pattern:

1. **Models**: Core domain entities and business logic
2. **Repositories**: Data access layer
3. **Services**: Business logic and use cases
4. **Controllers**: HTTP request/response handling
5. **Routes**: API endpoints
6. **Middleware**: Request processing and security

## Database Schema

The database schema is defined in migrations. To view the complete schema, see:

- [Migration Files](../../../../src/server/database/migrations/migrations)
- [Auth Migration Template](../../../../src/server/database/migrations/migrationConfig.ts)

You can also examine the domain models to understand the data structure:

- [User Model](../../../../src/server/database/models/auth/User.ts)
- [Role Model](../../../../src/server/database/models/auth/Role.ts)
- [Permission Model](../../../../src/server/database/models/auth/Permission.ts)
- [Token Model](../../../../src/server/database/models/auth/Token.ts)
- And more...

## Setup

To set up the auth system, run the following commands:

1. Create the auth migration:

   ```
   npm run db:migrate:auth
   ```

2. Run migrations:

   ```
   npm run db:migrate
   ```

3. Check migration status:
   ```
   npm run db:migrate:status
   ```

## API Endpoints

The authentication API provides the following endpoints:

- **POST /api/auth/register**: Register a new user
- **POST /api/auth/login**: Login with credentials
- **POST /api/auth/refresh**: Refresh access token
- **POST /api/auth/logout**: Logout user
- **POST /api/auth/password-reset**: Request password reset
- **POST /api/auth/reset-password/:token**: Reset password with token
- **POST /api/auth/verify-email**: Verify email address
- **POST /api/auth/verify-email/resend**: Resend verification email
- **POST /api/auth/mfa/setup**: Set up MFA
- **POST /api/auth/mfa/verify**: Verify MFA token
- **POST /api/auth/mfa/disable**: Disable MFA
- **GET /api/auth/sessions**: Get user sessions

## Role-Based Access Control

The system has three default roles:

1. **Admin**: Full system access
2. **User**: Basic access to user features
3. **Moderator**: Access to moderation features

Permissions are granular and defined as resource + action pairs:

- `user:read`
- `user:create`
- `user:update`
- `user:delete`
- And many more...

## Authentication Flow

1. **Registration**:
   - User submits registration form
   - System creates user with hashed password
   - Verification email is sent
   - User is logged in with JWT token

2. **Login**:
   - User submits login credentials
   - System verifies credentials
   - If MFA is enabled, a temporary token is issued
   - User completes MFA verification
   - System issues JWT token and refresh token

3. **Session Management**:
   - JWT tokens are short-lived (15 min)
   - Refresh tokens are used to get new JWT tokens
   - User can view and manage active sessions

4. **Password Reset**:
   - User requests password reset
   - System issues time-limited reset token
   - User sets new password using token

## Security Features

The auth system implements several security best practices:

- Passwords are hashed using bcrypt
- JWT tokens are signed and verified
- CSRF protection
- Rate limiting on auth endpoints
- Brute force protection
- Secure password policy enforcement
- Same-origin policy
- HTTPOnly cookies for refresh tokens
- Sensitive data exclusion from responses

## Implementation Guide

For detailed implementation instructions, see [IMPLEMENTATION.md](./IMPLEMENTATION.md).
