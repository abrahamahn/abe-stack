# 🔄 HTTP Middleware

## 📋 Purpose

The middleware module provides a collection of Express middleware components for enhancing HTTP request processing, offering:

- Input validation and request filtering
- Rate limiting and throttling
- Request preprocessing and normalization
- Cross-cutting concerns like logging and error handling
- Security enhancements
- Performance monitoring

This module serves as a central location for HTTP pipeline components that can be composed to create robust and secure API endpoints.

## 🧩 Key Components

### 1️⃣ Rate Limiting

- **`rateLimitMiddleware`**: Protects endpoints from abuse
- Configurable limits based on client IP, user ID, or custom keys
- Sliding window implementation with memory and Redis backends

### 2️⃣ Validation

- **`validationMiddleware`**: Validates request inputs
- Schema-based validation for request bodies, params, and queries
- Consistent error responses for invalid inputs

### 3️⃣ Module Exports

- **`index.ts`**: Exports all middleware components
- Provides factory functions for middleware customization

## 🛠️ Usage Instructions

### Rate Limiting

```typescript
import express from "express";
import { rateLimitMiddleware } from "@/server/infrastructure/middleware";

const app = express();

// Basic rate limiter - 100 requests per IP per 15 minutes
app.use(
  rateLimitMiddleware({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    message: "Too many requests, please try again later",
  }),
);

// Route-specific rate limiter - 5 requests per minute for login
app.post(
  "/auth/login",
  rateLimitMiddleware({
    windowMs: 60 * 1000, // 1 minute
    max: 5, // 5 attempts per minute
    keyGenerator: (req) => req.ip, // Key by IP address
    message: { error: "Too many login attempts, please try again later" },
  }),
  loginController,
);
```

### Request Validation

```typescript
import express from "express";
import { validationMiddleware } from "@/server/infrastructure/middleware";
import { z } from "zod"; // Using zod for schema validation

const app = express();

// Define validation schema
const createUserSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(8),
    name: z.string().min(1),
  }),
  query: z.object({
    referral: z.string().optional(),
  }),
});

// Apply validation middleware to route
app.post("/users", validationMiddleware(createUserSchema), async (req, res) => {
  // Request is valid at this point
  const { email, password, name } = req.body;

  // Implementation...
  const user = await userService.createUser({ email, password, name });

  res.status(201).json(user);
});
```

### Combining Middleware

```typescript
import express from "express";
import {
  rateLimitMiddleware,
  validationMiddleware,
  authMiddleware, // Hypothetical auth middleware
} from "@/server/infrastructure/middleware";

const app = express();

// Complex route with multiple middleware
app.post(
  "/posts",
  // Rate limiting
  rateLimitMiddleware({ windowMs: 60 * 1000, max: 10 }),

  // Authentication
  authMiddleware.requireAuth(),

  // Validation
  validationMiddleware({
    body: z.object({
      title: z.string().min(1).max(100),
      content: z.string().min(1),
      tags: z.array(z.string()).optional(),
    }),
  }),

  // Route handler
  postsController.createPost,
);
```

## 🏗️ Architecture Decisions

### Express Middleware Pattern

- **Decision**: Use Express middleware pattern
- **Rationale**: Consistent with Express ecosystem and familiar to developers
- **Benefit**: Composable, chainable request processing pipeline

### Factory Function Design

- **Decision**: Implement middleware as factory functions
- **Rationale**: Allows customization through configuration options
- **Implementation**: Functions that return middleware functions

### Error Normalization

- **Decision**: Normalize error responses across middleware
- **Rationale**: Provides consistent API error format
- **Benefit**: Predictable error handling for API clients

### Performance Considerations

- **Decision**: Implement efficient middleware processing
- **Rationale**: Minimize request processing overhead
- **Implementation**: Lightweight middleware with optimized execution paths

## ⚙️ Setup and Configuration Notes

### Global Middleware Setup

For application-wide middleware:

```typescript
import express from "express";
import {
  rateLimitMiddleware,
  jsonBodyParserMiddleware, // Hypothetical body parser middleware
  corsMiddleware, // Hypothetical CORS middleware
  securityHeadersMiddleware, // Hypothetical security headers middleware
  requestIdMiddleware, // Hypothetical request ID middleware
} from "@/server/infrastructure/middleware";

export function setupGlobalMiddleware(app: express.Application): void {
  // Add request ID to all requests
  app.use(requestIdMiddleware());

  // Security headers
  app.use(securityHeadersMiddleware());

  // CORS handling
  app.use(
    corsMiddleware({
      origin: process.env.CORS_ORIGIN || "*",
    }),
  );

  // Parse JSON request bodies
  app.use(jsonBodyParserMiddleware({ limit: "1mb" }));

  // Global rate limiting
  app.use(
    rateLimitMiddleware({
      windowMs: 15 * 60 * 1000,
      max: 500,
      message: "Too many requests from this IP",
    }),
  );
}
```

### Route-Specific Middleware

For specific routes or route groups:

```typescript
import express from "express";
import {
  validationMiddleware,
  authMiddleware,
} from "@/server/infrastructure/middleware";

export function setupApiRoutes(app: express.Application): void {
  const apiRouter = express.Router();

  // Apply middleware to all API routes
  apiRouter.use(authMiddleware.extractUser());

  // User routes
  const userRouter = express.Router();

  userRouter.get(
    "/profile",
    authMiddleware.requireAuth(),
    userController.getProfile,
  );

  userRouter.put(
    "/profile",
    authMiddleware.requireAuth(),
    validationMiddleware({
      body: profileUpdateSchema,
    }),
    userController.updateProfile,
  );

  // Mount user routes
  apiRouter.use("/users", userRouter);

  // Mount API router
  app.use("/api", apiRouter);
}
```

### Rate Limiter Configuration

Configuration options for rate limiting:

```typescript
// Memory-based rate limiter (default)
const memoryLimiter = rateLimitMiddleware({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  standardHeaders: true,
  message: "Rate limit exceeded",
});

// Redis-based rate limiter (for distributed systems)
const redisLimiter = rateLimitMiddleware({
  store: new RedisStore({
    client: redisClient,
    prefix: "ratelimit:",
  }),
  windowMs: 60 * 1000,
  max: 100,
});
```

### Validation Error Customization

Customize validation error responses:

```typescript
const validationOptions = {
  errorFormatter: (errors) => ({
    status: 400,
    message: "Validation failed",
    errors: errors.map((err) => ({
      path: err.path.join("."),
      message: err.message,
    })),
  }),
};

app.use(validationMiddleware(schema, validationOptions));
```
