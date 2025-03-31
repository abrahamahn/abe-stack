# API Documentation

## Table of Contents

1. [Overview](#overview)
2. [Base URL](#base-url)
3. [Authentication](#authentication)
4. [Users Management](#users-management)
5. [Sessions Management](#sessions-management)
6. [Roles and Permissions](#roles-and-permissions)
7. [Error Handling](#error-handling)
8. [Data Models](#data-models)
9. [Security Considerations](#security-considerations)

## Overview

This REST API follows a domain-driven design architecture with separate modules for authentication, user management, sessions, roles and permissions. The API is implemented using Express.js with TypeScript and uses JWT for authentication.

### Project Structure

```
api/
├── domains/
│   ├── auth/       # Authentication domain
│   ├── user/       # User management domain
│   ├── session/    # Session management domain
│   ├── social/     # Social features domain
│   └── media/      # Media handling domain
└── routes/
    └── v1/         # API version 1 routes
```

## Base URL

All API endpoints are prefixed with:

```
/api/v1/
```

## Authentication

The API implements a comprehensive authentication system with JWT tokens, refresh tokens, MFA support, and email verification.

### Authentication Endpoints

| Method | Endpoint                      | Description                            | Access  |
| ------ | ----------------------------- | -------------------------------------- | ------- |
| POST   | `/auth/login`                 | Login with username/email and password | Public  |
| POST   | `/auth/register`              | Register a new user                    | Public  |
| POST   | `/auth/refresh-token`         | Refresh the access token               | Public  |
| POST   | `/auth/logout`                | Logout and invalidate tokens           | Public  |
| POST   | `/auth/password-reset`        | Request a password reset               | Public  |
| POST   | `/auth/reset-password/:token` | Reset password using a token           | Public  |
| POST   | `/auth/verify-email`          | Verify email with token                | Public  |
| POST   | `/auth/verify-email/resend`   | Resend verification email              | Public  |
| POST   | `/auth/mfa/setup`             | Setup multi-factor authentication      | Private |
| POST   | `/auth/mfa/verify`            | Verify and enable MFA                  | Private |
| POST   | `/auth/mfa/disable`           | Disable MFA                            | Private |

### Authentication Flow

#### Registration Process

1. Client submits registration data to `/auth/register`
2. Server validates data and creates user account
3. Verification email is sent to user
4. User verifies email by clicking link in email
5. User can now login

#### Login Flow

1. Client submits credentials to `/auth/login`
2. If MFA is enabled, server returns `mfaRequired: true`
3. Client submits MFA code
4. Server validates and returns access token, refresh token, and user data

#### Token Refresh

1. When access token expires, client sends refresh token to `/auth/refresh-token`
2. Server validates refresh token and issues new access token

### Example Requests and Responses

#### Login Request

```json
POST /api/v1/auth/login
{
  "username": "johndoe",
  "password": "SecureP@ssw0rd",
  "mfaCode": "123456"  // Optional, required if MFA is enabled
}
```

#### Login Response

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user-1",
    "username": "johndoe",
    "email": "john@example.com"
  },
  "mfaRequired": false
}
```

#### Register Request

```json
POST /api/v1/auth/register
{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "SecureP@ssw0rd",
  "firstName": "John",
  "lastName": "Doe"
}
```

#### Register Response

```json
{
  "success": true,
  "message": "User registered successfully",
  "userId": "user-1"
}
```

## Users Management

The Users API provides comprehensive functionality for managing user accounts, profiles, and preferences.

### User Endpoints

| Method | Endpoint                        | Description                             | Access  |
| ------ | ------------------------------- | --------------------------------------- | ------- |
| GET    | `/users`                        | Get users with filtering and pagination | Admin   |
| GET    | `/users/me`                     | Get current user profile                | Private |
| GET    | `/users/search`                 | Search users                            | Private |
| GET    | `/users/:id`                    | Get user by ID                          | Private |
| PUT    | `/users/:id`                    | Update user                             | Private |
| DELETE | `/users/:id`                    | Delete user                             | Admin   |
| PUT    | `/users/:id/role`               | Update user role                        | Admin   |
| PUT    | `/users/:id/password`           | Update password                         | Private |
| GET    | `/users/:id/profile`            | Get user profile                        | Private |
| PUT    | `/users/:id/profile`            | Update profile information              | Private |
| PUT    | `/users/:id/profile/image`      | Update profile image                    | Private |
| GET    | `/users/:id/profile/completion` | Get profile completion status           | Private |

### User Preferences Endpoints

| Method | Endpoint                               | Description                     | Access  |
| ------ | -------------------------------------- | ------------------------------- | ------- |
| GET    | `/users/:id/preferences`               | Get user preferences            | Private |
| PUT    | `/users/:id/preferences`               | Update user preferences         | Private |
| PUT    | `/users/:id/preferences/notifications` | Update notification preferences | Private |
| PUT    | `/users/:id/preferences/privacy`       | Update privacy preferences      | Private |
| POST   | `/users/:id/preferences/reset`         | Reset preferences to defaults   | Private |

### Example Requests and Responses

#### Get User Request

```
GET /api/v1/users/user-1
Authorization: Bearer your-jwt-token
```

#### Get User Response

```json
{
  "id": "user-1",
  "username": "johndoe",
  "email": "john@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "role": "user",
  "createdAt": "2023-01-01T00:00:00.000Z",
  "updatedAt": "2023-01-02T00:00:00.000Z",
  "isActive": true,
  "isEmailVerified": true,
  "lastLoginAt": "2023-01-02T00:00:00.000Z"
}
```

#### Update User Profile Request

```json
PUT /api/v1/users/user-1/profile
Authorization: Bearer your-jwt-token
{
  "displayName": "Johnny Doe",
  "bio": "Software developer and avid hiker",
  "location": "New York, NY",
  "website": "https://johndoe.com",
  "company": "Example Inc.",
  "jobTitle": "Senior Developer"
}
```

#### Update User Profile Response

```json
{
  "success": true,
  "message": "Profile updated successfully",
  "profile": {
    "id": "profile-user-1",
    "userId": "user-1",
    "displayName": "Johnny Doe",
    "bio": "Software developer and avid hiker",
    "location": "New York, NY",
    "website": "https://johndoe.com",
    "company": "Example Inc.",
    "jobTitle": "Senior Developer",
    "profileImage": "https://example.com/images/profile.jpg",
    "coverImage": "https://example.com/images/cover.jpg",
    "socialLinks": {
      "twitter": "https://twitter.com/johndoe",
      "linkedin": "https://linkedin.com/in/johndoe",
      "github": "https://github.com/johndoe"
    },
    "createdAt": "2023-01-01T00:00:00.000Z",
    "updatedAt": "2023-01-15T00:00:00.000Z"
  }
}
```

## Sessions Management

The Sessions API provides functionality to view and manage user login sessions across devices.

### Session Endpoints

| Method | Endpoint               | Description                           | Access  |
| ------ | ---------------------- | ------------------------------------- | ------- |
| GET    | `/sessions`            | Get user's active sessions            | Private |
| DELETE | `/sessions/:sessionId` | Terminate a specific session          | Private |
| DELETE | `/sessions/all`        | Terminate all sessions except current | Private |

### Example Requests and Responses

#### Get Sessions Request

```
GET /api/v1/sessions
Authorization: Bearer your-jwt-token
```

#### Get Sessions Response

```json
{
  "sessions": [
    {
      "id": "session-1",
      "userId": "user-1",
      "deviceInfo": {
        "type": "desktop",
        "browser": "Chrome",
        "os": "Windows",
        "ip": "192.168.1.1",
        "userAgent": "Mozilla/5.0"
      },
      "createdAt": "2023-01-15T12:30:00.000Z",
      "lastActiveAt": "2023-01-15T14:20:00.000Z",
      "isCurrent": true
    },
    {
      "id": "session-2",
      "userId": "user-1",
      "deviceInfo": {
        "type": "mobile",
        "browser": "Safari",
        "os": "iOS",
        "ip": "192.168.1.2",
        "userAgent": "Mozilla/5.0"
      },
      "createdAt": "2023-01-14T10:15:00.000Z",
      "lastActiveAt": "2023-01-15T09:45:00.000Z",
      "isCurrent": false
    }
  ]
}
```

## Roles and Permissions

The Roles and Permissions API provides functionality for role-based access control (RBAC).

### Roles Endpoints

| Method | Endpoint                               | Description                  | Access |
| ------ | -------------------------------------- | ---------------------------- | ------ |
| GET    | `/roles`                               | Get all roles with filtering | Admin  |
| POST   | `/roles`                               | Create a new role            | Admin  |
| GET    | `/roles/:id`                           | Get role by ID               | Admin  |
| PUT    | `/roles/:id`                           | Update role                  | Admin  |
| DELETE | `/roles/:id`                           | Delete role                  | Admin  |
| GET    | `/roles/:id/permissions`               | Get role permissions         | Admin  |
| POST   | `/roles/:id/permissions`               | Assign permission to role    | Admin  |
| DELETE | `/roles/:id/permissions/:permissionId` | Remove permission from role  | Admin  |

### Permissions Endpoints

| Method | Endpoint           | Description                        | Access |
| ------ | ------------------ | ---------------------------------- | ------ |
| GET    | `/permissions`     | Get all permissions with filtering | Admin  |
| POST   | `/permissions`     | Create a new permission            | Admin  |
| GET    | `/permissions/:id` | Get permission by ID               | Admin  |
| PUT    | `/permissions/:id` | Update permission                  | Admin  |
| DELETE | `/permissions/:id` | Delete permission                  | Admin  |

### Example Requests and Responses

#### Create Role Request

```json
POST /api/v1/roles
Authorization: Bearer your-jwt-token
{
  "name": "editor",
  "description": "Can edit but not publish content"
}
```

#### Create Role Response

```json
{
  "id": "role-1",
  "name": "editor",
  "description": "Can edit but not publish content",
  "isSystem": false,
  "createdAt": "2023-01-15T00:00:00.000Z",
  "updatedAt": "2023-01-15T00:00:00.000Z"
}
```

#### Assign Permission Request

```json
POST /api/v1/roles/role-1/permissions
Authorization: Bearer your-jwt-token
{
  "permissionId": "permission-1"
}
```

#### Assign Permission Response

```json
{
  "success": true,
  "message": "Permission assigned to role successfully",
  "rolePermission": {
    "roleId": "role-1",
    "permissionId": "permission-1",
    "createdAt": "2023-01-15T00:00:00.000Z"
  }
}
```

## Error Handling

The API uses standard HTTP status codes to indicate the success or failure of requests:

| Status Code | Description                         |
| ----------- | ----------------------------------- |
| 200         | Success                             |
| 201         | Created                             |
| 204         | No Content                          |
| 400         | Bad Request (validation errors)     |
| 401         | Unauthorized                        |
| 403         | Forbidden                           |
| 404         | Not Found                           |
| 409         | Conflict (e.g., duplicate resource) |
| 500         | Internal Server Error               |

### Error Response Format

```json
{
  "success": false,
  "message": "Detailed error message",
  "error": "Optional error code or identifier"
}
```

### Validation Errors

For validation errors, the response includes details about the specific fields:

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Please enter a valid email address"
    },
    {
      "field": "password",
      "message": "Password must be at least 8 characters"
    }
  ]
}
```

## Data Models

### User

```typescript
interface UserDto {
  id: string;
  username: string;
  email: string;
  displayName?: string;
  firstName?: string;
  lastName?: string;
  role: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
  isEmailVerified: boolean;
  lastLoginAt?: string;
}
```

### User Profile

```typescript
interface UserProfileDto {
  id: string;
  userId: string;
  displayName?: string;
  bio?: string;
  location?: string;
  website?: string;
  company?: string;
  jobTitle?: string;
  profileImage?: string;
  coverImage?: string;
  socialLinks?: {
    twitter?: string;
    facebook?: string;
    instagram?: string;
    linkedin?: string;
    github?: string;
  };
  createdAt: string;
  updatedAt: string;
}
```

### User Preferences

```typescript
interface UserPreferencesDto {
  id: string;
  userId: string;
  theme: string;
  language: string;
  timezone: string;
  notifications: {
    email: boolean;
    push: boolean;
    sms: boolean;
    emailMarketing: boolean;
    emailUpdates: boolean;
    emailSecurity: boolean;
  };
  privacy: {
    profileVisibility: "public" | "private" | "connections";
    showEmail: boolean;
    showLocation: boolean;
    allowSearchByEmail: boolean;
    allowSearchByPhone: boolean;
  };
  createdAt: string;
  updatedAt: string;
}
```

### Role

```typescript
interface RoleDto {
  id: string;
  name: string;
  description?: string;
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
}
```

### Permission

```typescript
interface PermissionDto {
  id: string;
  name: string;
  description?: string;
  resource: string;
  action: string;
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
}
```

### Session

```typescript
interface SessionDto {
  id: string;
  userId: string;
  deviceInfo: {
    type: string;
    browser?: string;
    os?: string;
    ip?: string;
    userAgent?: string;
  };
  createdAt: string;
  lastActiveAt: string;
  isCurrent: boolean;
}
```

## Security Considerations

### Authentication

- JWT tokens expire after a configurable time (default: 1 hour)
- Refresh tokens have a longer lifespan (default: 7 days)
- Failed login attempts are rate-limited to prevent brute force attacks
- Passwords are hashed using bcrypt with appropriate salt rounds

### Multi-Factor Authentication

- Implements TOTP (Time-based One-Time Password) for MFA
- MFA secrets are encrypted in the database
- Backup codes are provided when MFA is enabled

### Data Protection

- PII (Personally Identifiable Information) is appropriately secured
- Email verification required for sensitive operations
- Password reset tokens expire after 1 hour
- Session information is stored securely

### API Security

- Rate limiting on all endpoints to prevent abuse
- CSRF protection for authenticated requests
- Input validation on all endpoints
- Proper error handling to prevent information leakage
- Authorization checks on all protected endpoints
