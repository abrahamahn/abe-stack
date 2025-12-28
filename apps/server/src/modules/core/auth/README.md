# Building a Cookie-Based Authentication Module with Email Verification

This guide outlines the implementation of a secure cookie-based authentication system with email verification.

## Architecture Overview

This authentication module follows a feature-based architecture with clear separation of concerns:

```
src/server/modules/core/auth/
├── api/                      # API Layer (Controllers, Routes)
├── features/                 # Feature modules (Core auth, Password, MFA, etc.)
├── middleware/               # Auth-related middleware
├── storage/                  # Data persistence
├── utils/                    # Shared utilities
├── config/                   # Configuration
├── __tests__/                # Tests
├── index.ts                  # Public API
└── README.md                 # Documentation
```

## Key Components

### 1. Cookie-Based Authentication

We implement secure cookie-based authentication instead of client-side token storage (JWT in localStorage). This provides:

- Better security against XSS attacks (with HttpOnly cookies)
- Automatic inclusion in requests
- Built-in CSRF protection options (with SameSite attributes)

### 2. Email Verification

All new accounts require email verification before login. This:

- Prevents fake accounts
- Confirms user ownership of email
- Provides a secure channel for password reset

## Implementation Guide

### 1. Core Authentication Services

#### Registration Flow

```typescript
// features/core/providers/auth.service.ts
export class AuthService {
  constructor(
    private userRepository: UserRepository,
    private emailService: EmailService,
    private passwordService: PasswordService,
    private verificationService: VerificationService
  ) {}

  async register(data: RegisterDto): Promise<RegisterResponseDto> {
    // 1. Validate user data
    const validation = this.validateRegistration(data);
    if (!validation.valid) {
      return { success: false, message: validation.errors[0] };
    }

    // 2. Check if email already exists
    const existingUser = await this.userRepository.findByEmail(data.email);
    if (existingUser) {
      return { success: false, message: "Email already registered" };
    }

    // 3. Hash password
    const hashedPassword = await this.passwordService.hashPassword(
      data.password
    );

    // 4. Create unverified user
    const user = await this.userRepository.create({
      email: data.email,
      password: hashedPassword,
      firstName: data.firstName,
      lastName: data.lastName,
      verified: false,
      createdAt: new Date(),
    });

    // 5. Generate verification token and send email
    const verificationToken =
      await this.verificationService.createVerificationToken(user.id);
    await this.emailService.sendVerificationEmail(
      user.email,
      user.firstName || "",
      verificationToken.token
    );

    return {
      success: true,
      message:
        "Registration successful. Please check your email to verify your account.",
      userId: user.id,
    };
  }
}
```

#### Login Flow

```typescript
// features/core/providers/auth.service.ts
async login(
  credentials: LoginDto,
  req: Request,
  res: Response
): Promise<LoginResponseDto> {
  // 1. Find user by email
  const user = await this.userRepository.findByEmail(credentials.email);
  if (!user) {
    return { success: false, message: "Invalid email or password" };
  }

  // 2. Verify password
  const isPasswordValid = await this.passwordService.comparePassword(
    credentials.password,
    user.password
  );
  if (!isPasswordValid) {
    // Track failed login attempts
    await this.securityService.recordFailedLoginAttempt(user.id, req.ip);
    return { success: false, message: "Invalid email or password" };
  }

  // 3. Check if account is verified
  if (!user.verified) {
    return {
      success: false,
      message: "Please verify your email before logging in",
      requiresVerification: true
    };
  }

  // 4. Check for MFA requirement
  if (user.mfaEnabled) {
    const tempToken = await this.tokenService.generateTempToken(user.id);
    return {
      success: false,
      requiresMfa: true,
      tempToken,
      message: "MFA verification required"
    };
  }

  // 5. Create session and set cookies
  const session = await this.sessionService.createSession(user.id, req.ip, req.headers["user-agent"]);
  this.setCookies(res, user.id, session.id);

  // 6. Return user data (without sensitive information)
  return {
    success: true,
    user: this.sanitizeUser(user)
  };
}
```

### 2. Cookie Management

```typescript
// features/token/token.utils.ts
export function setCookies(
  res: Response,
  userId: string,
  sessionId: string,
  remember: boolean = false
): void {
  // 1. Create signed session identifier
  const sessionToken = sign(
    { userId, sessionId },
    process.env.COOKIE_SECRET as string,
    { expiresIn: remember ? "30d" : "24h" }
  );

  // 2. Set secure, HttpOnly session cookie
  res.cookie("session", sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax", // Protects against CSRF
    maxAge: remember ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000, // 30 days or 24 hours
    path: "/",
  });

  // 3. Set CSRF protection token (accessible to JavaScript)
  const csrfToken = generateCsrfToken();
  res.cookie("csrf", csrfToken, {
    httpOnly: false, // Accessible to client JavaScript
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: remember ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000,
    path: "/",
  });
}
```

### 3. Authentication Middleware

```typescript
// middleware/authenticate.middleware.ts
export function authenticate(options: AuthOptions = {}) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // 1. Get session cookie
      const sessionCookie = req.cookies.session;
      if (!sessionCookie) {
        return res.status(401).json({ error: "Authentication required" });
      }

      // 2. Verify session token
      let decoded;
      try {
        decoded = verify(
          sessionCookie,
          process.env.COOKIE_SECRET as string
        ) as { userId: string; sessionId: string };
      } catch (err) {
        clearAuthCookies(res);
        return res.status(401).json({ error: "Invalid or expired session" });
      }

      // 3. Verify session is valid in database
      const session = await sessionService.getSession(decoded.sessionId);
      if (!session || session.userId !== decoded.userId || !session.isActive) {
        clearAuthCookies(res);
        return res.status(401).json({ error: "Session not found or expired" });
      }

      // 4. Get user
      const user = await userRepository.findById(decoded.userId);
      if (!user) {
        clearAuthCookies(res);
        return res.status(401).json({ error: "User not found" });
      }

      // 5. Update session last activity
      await sessionService.updateLastActive(decoded.sessionId);

      // 6. Attach user to request
      req.user = user;
      req.sessionId = decoded.sessionId;

      next();
    } catch (error) {
      next(error);
    }
  };
}
```

### 4. Email Verification Flow

```typescript
// features/core/providers/verification.service.ts
export class VerificationService {
  constructor(
    private verificationRepository: VerificationTokenRepository,
    private userRepository: UserRepository,
    private emailService: EmailService
  ) {}

  async createVerificationToken(userId: string): Promise<VerificationToken> {
    // 1. Generate a secure random token
    const token = crypto.randomBytes(32).toString("hex");

    // 2. Create token with expiration (24 hours)
    const verificationToken = await this.verificationRepository.create({
      userId,
      token,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      createdAt: new Date(),
    });

    return verificationToken;
  }

  async verifyEmail(token: string): Promise<VerificationResult> {
    // 1. Find token
    const verificationToken =
      await this.verificationRepository.findByToken(token);
    if (!verificationToken) {
      return { success: false, message: "Invalid verification token" };
    }

    // 2. Check token expiration
    if (verificationToken.expiresAt < new Date()) {
      return { success: false, message: "Verification token has expired" };
    }

    // 3. Mark user as verified
    await this.userRepository.update(verificationToken.userId, {
      verified: true,
      emailVerifiedAt: new Date(),
    });

    // 4. Mark token as used
    await this.verificationRepository.markAsUsed(verificationToken.id);

    return { success: true, message: "Email verified successfully" };
  }

  async resendVerification(email: string): Promise<VerificationResult> {
    // 1. Find user by email
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      // Return success anyway to prevent email enumeration
      return {
        success: true,
        message:
          "If your email exists in our system, a verification link has been sent",
      };
    }

    // 2. Check if already verified
    if (user.verified) {
      return { success: true, message: "Your email is already verified" };
    }

    // 3. Invalidate any existing tokens
    await this.verificationRepository.invalidateForUser(user.id);

    // 4. Create new token and send email
    const verificationToken = await this.createVerificationToken(user.id);
    await this.emailService.sendVerificationEmail(
      user.email,
      user.firstName || "",
      verificationToken.token
    );

    return { success: true, message: "Verification email sent" };
  }
}
```

### 5. CSRF Protection

```typescript
// middleware/csrf.middleware.ts
export function csrfProtection() {
  return (req: Request, res: Response, next: NextFunction) => {
    // Skip for GET, HEAD, OPTIONS
    if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
      return next();
    }

    // Get CSRF token from request header and cookie
    const csrfHeader = req.headers["x-csrf-token"];
    const csrfCookie = req.cookies.csrf;

    // Validate CSRF token
    if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
      return res.status(403).json({ error: "CSRF token validation failed" });
    }

    next();
  };
}
```

### 6. Session Management

```typescript
// features/token/providers/session.service.ts
export class SessionService {
  constructor(private sessionRepository: SessionRepository) {}

  async createSession(
    userId: string,
    ipAddress: string,
    userAgent?: string
  ): Promise<Session> {
    // Create session record
    return this.sessionRepository.create({
      userId,
      ipAddress,
      userAgent,
      isActive: true,
      lastActiveAt: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      createdAt: new Date(),
    });
  }

  async getSession(sessionId: string): Promise<Session | null> {
    return this.sessionRepository.findById(sessionId);
  }

  async updateLastActive(sessionId: string): Promise<void> {
    await this.sessionRepository.update(sessionId, {
      lastActiveAt: new Date(),
    });
  }

  async invalidateSession(sessionId: string): Promise<void> {
    await this.sessionRepository.update(sessionId, {
      isActive: false,
    });
  }

  async getUserSessions(userId: string): Promise<Session[]> {
    return this.sessionRepository.findActiveByUser(userId);
  }
}
```

### 7. Logout Implementation

```typescript
// api/controllers/auth.controller.ts
async logout(req: Request, res: Response): Promise<void> {
  try {
    // 1. Get the current session ID
    const sessionId = req.sessionId;

    // 2. Invalidate the session if it exists
    if (sessionId) {
      await this.sessionService.invalidateSession(sessionId);
    }

    // 3. Clear auth cookies
    clearAuthCookies(res);

    // 4. Return success response
    res.status(200).json({
      success: true,
      message: "Logged out successfully"
    });
  } catch (error) {
    // Handle error
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
}
```

## Security Best Practices

### 1. Cookie Security

All authentication cookies must have these security attributes:

```typescript
{
  httpOnly: true,              // Prevents JavaScript access
  secure: process.env.NODE_ENV === 'production', // HTTPS only in production
  sameSite: 'lax',             // CSRF protection
  path: '/',                   // Available site-wide
}
```

### 2. Password Security

Password requirements and handling:

```typescript
// features/password/providers/password.service.ts
export class PasswordService {
  // Password complexity requirements
  static readonly PASSWORD_REQUIREMENTS = {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
  };

  // Password hashing using bcrypt
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12); // 12 rounds is a good balance
  }

  // Password verification
  async comparePassword(
    plainPassword: string,
    hashedPassword: string
  ): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  // Password validation
  validatePassword(password: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (password.length < this.PASSWORD_REQUIREMENTS.minLength) {
      errors.push(
        `Password must be at least ${this.PASSWORD_REQUIREMENTS.minLength} characters`
      );
    }

    if (
      this.PASSWORD_REQUIREMENTS.requireUppercase &&
      !/[A-Z]/.test(password)
    ) {
      errors.push("Password must contain at least one uppercase letter");
    }

    if (
      this.PASSWORD_REQUIREMENTS.requireLowercase &&
      !/[a-z]/.test(password)
    ) {
      errors.push("Password must contain at least one lowercase letter");
    }

    if (this.PASSWORD_REQUIREMENTS.requireNumbers && !/\d/.test(password)) {
      errors.push("Password must contain at least one number");
    }

    if (
      this.PASSWORD_REQUIREMENTS.requireSpecialChars &&
      !/[!@#$%^&*(),.?":{}|<>]/.test(password)
    ) {
      errors.push("Password must contain at least one special character");
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
```

### 3. Rate Limiting

Implement rate limiting to prevent brute force attacks:

```typescript
// middleware/rate-limit.middleware.ts
export function loginRateLimit(store: RateLimitStore) {
  return rateLimit({
    store,
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts per IP per window
    message: {
      success: false,
      message: "Too many login attempts, please try again later",
    },
    keyGenerator: (req) => {
      // Rate limit by IP and email if provided
      return req.body.email ? `${req.ip}:${req.body.email}` : req.ip;
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
}
```

## Testing Strategy

Implement comprehensive tests for authentication flows:

```typescript
// __tests__/auth-flow.test.ts
describe("Authentication Flow", () => {
  test("Register > Verify Email > Login > Access Protected Route > Logout", async () => {
    // 1. Register a new user
    const registerResponse = await request(app)
      .post("/api/auth/register")
      .send({
        email: "test@example.com",
        password: "Password123!",
        firstName: "Test",
        lastName: "User",
      });

    expect(registerResponse.status).toBe(200);
    expect(registerResponse.body.success).toBe(true);

    // 2. Get verification token from repository (in tests only)
    const verificationToken = await verificationRepository.findByUserId(
      registerResponse.body.userId
    );

    // 3. Verify email
    const verifyResponse = await request(app)
      .post("/api/auth/verify-email")
      .send({
        token: verificationToken.token,
      });

    expect(verifyResponse.status).toBe(200);
    expect(verifyResponse.body.success).toBe(true);

    // 4. Login
    const loginResponse = await request(app).post("/api/auth/login").send({
      email: "test@example.com",
      password: "Password123!",
    });

    expect(loginResponse.status).toBe(200);
    expect(loginResponse.body.success).toBe(true);

    // Save cookies
    const cookies = loginResponse.headers["set-cookie"];

    // 5. Access protected route
    const protectedResponse = await request(app)
      .get("/api/user/profile")
      .set("Cookie", cookies);

    expect(protectedResponse.status).toBe(200);

    // 6. Logout
    const logoutResponse = await request(app)
      .post("/api/auth/logout")
      .set("Cookie", cookies);

    expect(logoutResponse.status).toBe(200);
    expect(logoutResponse.body.success).toBe(true);

    // 7. Verify protected route is no longer accessible
    const afterLogoutResponse = await request(app)
      .get("/api/user/profile")
      .set("Cookie", cookies);

    expect(afterLogoutResponse.status).toBe(401);
  });
});
```

## Integration with Frontend

To use this authentication system from the frontend:

```typescript
// Client-side authentication service
export class AuthService {
  // Register a new user
  async register(userData) {
    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(userData),
    });
    return response.json();
  }

  // Login user
  async login(credentials) {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(credentials),
      credentials: "include", // Important! Includes cookies
    });
    return response.json();
  }

  // Logout user
  async logout() {
    const csrfToken = getCookie("csrf");
    const response = await fetch("/api/auth/logout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": csrfToken, // Include CSRF token
      },
      credentials: "include", // Important! Includes cookies
    });
    return response.json();
  }

  // Check authentication status
  async checkAuth() {
    try {
      const response = await fetch("/api/auth/me", {
        credentials: "include", // Important! Includes cookies
      });

      if (response.ok) {
        return response.json();
      }
      return { authenticated: false };
    } catch (error) {
      return { authenticated: false };
    }
  }
}

// For CSRF-protected requests
function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(";").shift();
}

// Making API requests with CSRF protection
async function apiRequest(url, method = "GET", data = null) {
  const csrfToken = getCookie("csrf");

  const options = {
    method,
    headers: {
      "Content-Type": "application/json",
      "X-CSRF-Token": csrfToken,
    },
    credentials: "include",
  };

  if (data) {
    options.body = JSON.stringify(data);
  }

  const response = await fetch(url, options);
  return response.json();
}
```

## Conclusion

This authentication system provides:

1. **Security**: Secure cookie-based auth with HttpOnly, Secure, and SameSite attributes
2. **Email Verification**: Required email verification flow for all users
3. **CSRF Protection**: Cross-Site Request Forgery protection with token validation
4. **Session Management**: Server-side session storage with activity tracking
5. **Password Security**: Strong password requirements and secure hashing

By following this implementation guide, you'll have a robust, secure authentication system that follows industry best practices.
