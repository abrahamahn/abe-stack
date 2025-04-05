# 🔒 Security Infrastructure

## 📋 Purpose

The security infrastructure provides a comprehensive framework for application security, offering:

- Authentication and authorization mechanisms
- Password hashing and validation
- Token generation and verification
- Cryptographic operations
- Digital signatures and verification
- CSRF protection
- Secure data handling
- Input sanitization

This module ensures that the application follows security best practices and provides robust protection against common vulnerabilities and attacks.

## 🧩 Key Components

### 1️⃣ Authentication Helpers

- **`authHelpers.ts`**: Core utilities for authentication
- Functions for user authentication, token handling, and session management
- Password validation and secure credential management

### 2️⃣ Security Helpers

- **`securityHelpers.ts`**: General security utilities
- Implements security best practices for common operations
- Input validation, sanitization, and secure coding patterns

### 3️⃣ Signature Helpers

- **`signatureHelpers.ts`**: Digital signature functionality
- Methods for creating and verifying digital signatures
- Support for various signature algorithms and formats

### 4️⃣ Security Middleware

- **`middleware/`**: Security-focused middleware components
- Protection against common web vulnerabilities
- Request filtering and validation

## 🛠️ Usage Instructions

### Authentication

```typescript
import {
  hashPassword,
  verifyPassword,
  generateToken,
} from "@/server/infrastructure/security/authHelpers";

// User registration
async function registerUser(email: string, password: string): Promise<User> {
  // Hash password securely
  const passwordHash = await hashPassword(password);

  // Store user with hashed password
  const user = await userRepository.create({
    email,
    password: passwordHash,
  });

  return user;
}

// User login
async function authenticateUser(
  email: string,
  password: string,
): Promise<{ user: User; token: string } | null> {
  // Find user
  const user = await userRepository.findByEmail(email);

  if (!user) {
    return null;
  }

  // Verify password
  const isValid = await verifyPassword(password, user.password);

  if (!isValid) {
    return null;
  }

  // Generate authentication token
  const token = generateToken({
    userId: user.id,
    roles: user.roles,
  });

  return { user, token };
}
```

### Secure Data Handling

```typescript
import {
  encrypt,
  decrypt,
  sanitizeInput,
} from "@/server/infrastructure/security/securityHelpers";

// Encrypt sensitive data
async function storePaymentInfo(
  userId: string,
  cardInfo: CardInfo,
): Promise<void> {
  // Encrypt sensitive information
  const encryptedCardNumber = await encrypt(cardInfo.cardNumber);

  // Store encrypted data
  await paymentRepository.saveCard({
    userId,
    cardNumber: encryptedCardNumber,
    expiryMonth: cardInfo.expiryMonth,
    expiryYear: cardInfo.expiryYear,
    cardholderName: cardInfo.cardholderName,
  });
}

// Decrypt sensitive data
async function getPaymentInfo(userId: string): Promise<CardInfo | null> {
  // Retrieve encrypted data
  const card = await paymentRepository.getCardByUser(userId);

  if (!card) {
    return null;
  }

  // Decrypt sensitive information
  const cardNumber = await decrypt(card.cardNumber);

  return {
    cardNumber,
    expiryMonth: card.expiryMonth,
    expiryYear: card.expiryYear,
    cardholderName: card.cardholderName,
  };
}

// Sanitize user input
function processUserComment(comment: string): string {
  // Sanitize input to prevent XSS
  return sanitizeInput(comment);
}
```

### Digital Signatures

```typescript
import {
  generateSignature,
  verifySignature,
} from "@/server/infrastructure/security/signatureHelpers";

// Sign data for verification
async function createSignedRequest(payload: any): Promise<SignedRequest> {
  // Convert payload to string
  const payloadStr = JSON.stringify(payload);

  // Generate signature
  const signature = await generateSignature(payloadStr);

  return {
    payload,
    signature,
    timestamp: Date.now(),
  };
}

// Verify signed data
async function verifySignedRequest(request: SignedRequest): Promise<boolean> {
  // Check if request is expired
  const isExpired = Date.now() - request.timestamp > 3600000; // 1 hour

  if (isExpired) {
    return false;
  }

  // Convert payload to string
  const payloadStr = JSON.stringify(request.payload);

  // Verify signature
  return await verifySignature(payloadStr, request.signature);
}
```

### Security Middleware

```typescript
import { Router } from "express";
import {
  csrfProtection,
  rateLimit,
  securityHeaders,
} from "@/server/infrastructure/security/middleware";

// Create secure router
function createSecureRouter(): Router {
  const router = Router();

  // Add security headers
  router.use(securityHeaders());

  // Add rate limiting
  router.use(
    rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // Limit each IP to 100 requests per windowMs
    }),
  );

  // Add CSRF protection for state-changing operations
  router.post("*", csrfProtection());
  router.put("*", csrfProtection());
  router.delete("*", csrfProtection());

  return router;
}
```

## 🏗️ Architecture Decisions

### Secure By Default

- **Decision**: Implement security by default
- **Rationale**: Prevents accidental security vulnerabilities
- **Benefit**: Reduces risk of common security mistakes

### Defense in Depth

- **Decision**: Apply multiple layers of security controls
- **Rationale**: Single security controls can fail or be bypassed
- **Implementation**: Authentication, authorization, encryption, and validation

### Modern Cryptography

- **Decision**: Use modern cryptographic algorithms
- **Rationale**: Older algorithms may have known vulnerabilities
- **Implementation**: Argon2 for password hashing, AES-GCM for encryption

### Principle of Least Privilege

- **Decision**: Enforce access control based on least privilege
- **Rationale**: Minimizes the impact of security breaches
- **Benefit**: Limits what attackers can access if credentials are compromised

## ⚙️ Setup and Configuration Notes

### Environment Variables

Security-related environment variables:

```
JWT_SECRET=your-secret-key
JWT_EXPIRATION=86400
ENCRYPTION_KEY=32-byte-encryption-key
CSRF_SECRET=csrf-secret-key
```

### Password Hashing Configuration

Configure password hashing:

```typescript
import { configurePasswordHashing } from "@/server/infrastructure/security/authHelpers";

// Configure password hashing (Argon2)
configurePasswordHashing({
  // Appropriate settings for your environment
  // More memory/time = more secure but slower
  memoryCost: 4096, // Memory usage in KiB
  timeCost: 3, // Number of iterations
  parallelism: 1, // Degree of parallelism
  hashLength: 32, // Output hash length
});
```

### Token Configuration

Configure token generation:

```typescript
import { configureTokens } from "@/server/infrastructure/security/authHelpers";

configureTokens({
  // JWT configuration
  algorithm: "HS256",
  expiresIn: "24h",
  issuer: "your-application-name",
  audience: "your-api",

  // Token secrets
  secret: process.env.JWT_SECRET!,
  refreshSecret: process.env.JWT_REFRESH_SECRET!,
});
```

### Security Headers

Configure security headers:

```typescript
import { configureSecurityHeaders } from "@/server/infrastructure/security/middleware";

// Configure standard security headers
configureSecurityHeaders({
  // Content Security Policy
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "trusted-cdn.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "trusted-cdn.com"],
      imgSrc: ["'self'", "data:", "trusted-cdn.com"],
      connectSrc: ["'self'", "api.example.com"],
    },
  },

  // HTTP Strict Transport Security
  strictTransportSecurity: {
    maxAge: 63072000, // 2 years
    includeSubDomains: true,
    preload: true,
  },

  // Other security headers
  xFrameOptions: "DENY",
  xContentTypeOptions: "nosniff",
  referrerPolicy: "same-origin",
});
```

### Encryption Configuration

Configure encryption:

```typescript
import { configureEncryption } from "@/server/infrastructure/security/securityHelpers";

// Configure encryption
configureEncryption({
  // Encryption settings
  algorithm: "aes-256-gcm",
  keySize: 32, // 256 bits
  ivSize: 16, // 128 bits

  // Key management
  encryptionKey: Buffer.from(process.env.ENCRYPTION_KEY!, "hex"),
});
```

### Security Best Practices

Important security guidelines:

1. **Keep Dependencies Updated**: Regularly update dependencies to patch security vulnerabilities.
2. **Implement Rate Limiting**: Protect against brute force and DoS attacks.
3. **Use HTTPS**: Always use HTTPS in production environments.
4. **Validate All Input**: Never trust user input without validation.
5. **Implement Proper Logging**: Log security events but never log sensitive information.
6. **Use Content Security Policy**: Mitigate XSS attacks with CSP headers.
7. **Regular Security Audits**: Conduct security reviews and penetration testing.
8. **Follow OWASP Guidelines**: Adhere to OWASP Top Ten security recommendations.
