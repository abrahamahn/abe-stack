# @abe-stack/core

The foundation of ABE Stack. This package contains everything that should be shared across the entire application: contracts, validation, errors, and business logic. No React. No Fastify. No Node.js APIs in the main exports. Just pure TypeScript that runs anywhere.

## Why Framework-Agnostic?

We made a deliberate choice early on: **core must work in any JavaScript environment**. This decision shapes everything about how we build.

Consider password validation. We need it in three places:

1. **Client-side** - immediate feedback as users type
2. **API validation** - reject weak passwords at the boundary
3. **Server-side business logic** - enforce rules before database writes

Without a shared package, we would write this logic three times. Or worse, we would write it once on the server and skip client validation entirely. Neither option is acceptable.

By keeping core framework-agnostic, we guarantee that `validatePassword()` works identically whether called from a React component, a Fastify route handler, or an Electron preload script. Same code, same behavior, tested once.

The trade-off is real: we cannot use Node.js APIs directly in the main export. File operations, child processes, and other server-only utilities live in subpath exports like `@abe-stack/core/media`. Browser code imports from the main entry point; server code can import from both.

```typescript
// Works everywhere
import { validatePassword, AppError, encodeCursor } from '@abe-stack/core';

// Server only - uses Node.js APIs
import { parseAudioMetadata, detectFileType } from '@abe-stack/core/media';
```

## The Flow of Validation

Understanding how validation flows through ABE Stack explains why core exists. Let us trace a user registration request from browser to database.

**Step 1: Define the contract (core)**

```typescript
// packages/core/src/contracts/auth.ts
export const registerRequestSchema = z.object({
  email: emailSchema,
  name: nameSchema,
  password: passwordSchema,
});

export const authContract = c.router({
  register: {
    method: 'POST',
    path: '/api/auth/register',
    body: registerRequestSchema,
    responses: {
      201: registerResponseSchema,
      400: errorResponseSchema,
      409: errorResponseSchema,
    },
  },
});
```

This contract is the single source of truth. The Zod schema validates both requests and responses. The ts-rest contract generates type-safe API clients.

**Step 2: Client validates before sending (web)**

```typescript
// apps/web - form submission
const result = registerRequestSchema.safeParse(formData);
if (!result.success) {
  // Show validation errors immediately
  return;
}
// Only send valid data
await api.auth.register({ body: result.data });
```

**Step 3: Server validates at the boundary (server)**

ts-rest automatically validates incoming requests against the contract. Invalid requests never reach our handlers. We do not write validation code in route handlers because the contract already handles it.

**Step 4: Business logic validates domain rules (server using core)**

```typescript
// apps/server/src/modules/auth/service.ts
import { validatePassword, WeakPasswordError } from '@abe-stack/core';

async function registerUser(data: RegisterRequest) {
  // Domain validation beyond schema rules
  const passwordResult = await validatePassword(data.password, [data.email, data.name]);
  if (!passwordResult.isValid) {
    throw new WeakPasswordError({ errors: passwordResult.errors });
  }
  // Continue with user creation...
}
```

The key insight: Zod schemas handle structural validation (is this a valid email format?), while domain functions handle business rules (is this password strong enough given the user's email?).

## Structure: Domains vs Infrastructure

We organize core into two main categories:

```
packages/core/src/
├── contracts/         # API contracts (Zod schemas + ts-rest routes)
├── domains/           # Business logic specific to ABE Stack
│   ├── auth/          # Password validation, auth errors
│   └── pagination/    # Cursor encoding, pagination helpers
├── infrastructure/    # Generic utilities (could be npm packages)
│   ├── async/         # BatchedQueue, DeferredPromise, ReactiveMap
│   ├── constants/     # HTTP status codes, time constants
│   ├── errors/        # Base error classes
│   ├── stores/        # Toast store, undo/redo state
│   └── transactions/  # Operation types for undo/redo
├── errors/            # HTTP error mapping (bridges domain to HTTP)
├── media/             # Media processing (server-only subpath export)
└── shared/            # Token storage, cross-package utilities
```

**Domains** contain business logic that only makes sense in ABE Stack. **Infrastructure** contains generic utilities that could work in any application. When adding new code, ask: "Would this make sense in a completely different application?" If yes, infrastructure. If no, a domain module.

## Error Handling Philosophy

We use typed error classes extensively. This is not about object-oriented programming for its own sake - it is about making impossible states impossible to ignore.

```typescript
// packages/core/src/domains/auth/errors.ts
export class InvalidCredentialsError extends UnauthorizedError {
  constructor() {
    super('Invalid email or password', 'INVALID_CREDENTIALS');
  }
}

export class EmailNotVerifiedError extends UnauthorizedError {
  constructor(
    public readonly email: string,
    message = 'Please verify your email address before logging in',
  ) {
    super(message, 'EMAIL_NOT_VERIFIED');
  }
}
```

Notice that `EmailNotVerifiedError` carries the email address. This is not incidental - the client needs it to offer "resend verification email" functionality. The error type encodes both the problem and the information needed to resolve it.

The `httpMapper` bridges domain errors to HTTP responses:

```typescript
// packages/core/src/errors/httpMapper.ts
export function mapErrorToHttpResponse(
  error: unknown,
  logger: ErrorMapperLogger,
): HttpErrorResponse {
  if (error instanceof AccountLockedError) {
    return { status: 429, body: { message: HTTP_ERROR_MESSAGES.ACCOUNT_LOCKED } };
  }
  if (error instanceof EmailNotVerifiedError) {
    return {
      status: 401,
      body: { message: error.message, code: 'EMAIL_NOT_VERIFIED', email: error.email },
    };
  }
  // ... other error types
  logger.error(error);
  return { status: 500, body: { message: HTTP_ERROR_MESSAGES.INTERNAL_ERROR } };
}
```

This centralizes HTTP mapping. Route handlers throw domain errors; a single function converts them to responses. We do not scatter `instanceof` checks across every handler.

## DRY in Practice

The DRY principle can be taken too far. We apply it pragmatically:

**Do share:** Validation schemas used in multiple places, error types thrown by one layer and caught by another, business logic that must behave identically everywhere, constants that would cause bugs if inconsistent.

**Do not share:** UI-specific formatting (belongs in components), database-specific queries (belongs in server), one-off utilities used in a single file.

A practical example: we have cursor encoding in core because both server and client need identical logic. But SQL query building stays server-side - that is not shared logic.

```typescript
// Shared: cursor encoding/decoding
import { encodeCursor, decodeCursor } from '@abe-stack/core';

// Server only: building the actual query
import { buildCursorPaginationQuery } from './domains/pagination';
```

## Adding a New Domain

When adding a new domain (say, "projects"), follow this pattern:

1. **Create the contract** in `contracts/projects.ts` - Zod schemas and ts-rest routes
2. **Create domain errors** in `domains/projects/errors.ts` - extend base error classes
3. **Add domain validation** in `domains/projects/validation.ts` - business rules beyond schemas
4. **Export from domain index** - explicit named exports only
5. **Export from package index** - make it available to consumers

```typescript
// Example: domain error with context for client handling
export class ProjectNotFoundError extends NotFoundError {
  constructor(projectId: string) {
    super(`Project not found: ${projectId}`, 'PROJECT_NOT_FOUND');
  }
}

// Example: domain validation beyond schema rules
export function validateProjectName(name: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (/^\d+$/.test(name)) errors.push('Project name cannot be purely numeric');
  return { isValid: errors.length === 0, errors };
}
```

Now the server can throw `ProjectNotFoundError`, the client can catch it and show appropriate UI, and both can use `validateProjectName` for consistent behavior.

## What Core Does Not Do

Understanding boundaries helps as much as understanding contents. Core knows nothing about: databases (Drizzle, Postgres), HTTP servers (Fastify, Express), UI frameworks (React, hooks, JSX), or Node.js APIs in the main export.

This is not accidental minimalism. These constraints ensure core remains truly portable. When we add Electron or React Native support, core works without changes. The foundation stays stable while applications built on it evolve.

## Installation

```bash
pnpm add @abe-stack/core
```

## Quick Reference

**Contracts:**

```typescript
import { authContract, userContract, apiContract } from '@abe-stack/core';
import type { LoginRequest, User, AuthResponse } from '@abe-stack/core';
```

**Errors:**

```typescript
import { AppError, BadRequestError, NotFoundError, mapErrorToHttpResponse } from '@abe-stack/core';
```

**Pagination:**

```typescript
import { encodeCursor, decodeCursor, paginateArrayWithCursor } from '@abe-stack/core';
```

**Auth utilities:**

```typescript
import { validatePassword, InvalidCredentialsError, AccountLockedError } from '@abe-stack/core';
```

**Infrastructure:**

```typescript
import { BatchedQueue, DeferredPromise, ReactiveMap } from '@abe-stack/core';
import { HTTP_STATUS, MS_PER_SECOND } from '@abe-stack/core';
```

**Media (server only):**

```typescript
import { detectFileType, parseAudioMetadata, getImageDimensions } from '@abe-stack/core/media';
```
