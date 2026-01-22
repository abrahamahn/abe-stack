# @abe-stack/core

> Framework-agnostic foundation.

Shared contracts, validation, errors, and business logic. No React. No Fastify. No Node.js APIs in main exports. Pure TypeScript that runs anywhere - browser, server, Electron, service workers.

## Features

- Zod schemas + ts-rest contracts 📜
- typed error classes 🚨
- cursor pagination helpers 📄
- password validation (OWASP) 🔐
- async utilities (BatchedQueue, DeferredPromise, ReactiveMap) ⚡
- OAuth flows (Google, GitHub, etc.) 🔑
- realtime sync/collaboration 🔄
- cache abstraction (memory, Redis) 💾
- full-text search (filters, facets, query builder) 🔍
- push notifications (Web Push API) 🔔
- JWT signing/verification 🎫
- state stores (toast, undo/redo) 🍞
- media processing (FFmpeg, image processing) 🎬
- environment validation ✅
- ~1600 tests passing ✨

## Installation

```bash
pnpm add @abe-stack/core
```

## Usage

```typescript
// Works everywhere (browser, server, Electron)
import {
  validatePassword,
  AppError,
  encodeCursor,
  authContract,
  oauthContract,
  SearchQueryBuilder,
  createStore,
  type LoginRequest,
} from '@abe-stack/core';

// Server only - uses Node.js APIs (separate package)
import { parseAudioMetadata, detectFileTypeFromFile } from '@abe-stack/media';
import { sign, verify } from '@abe-stack/core/crypto';
import { loadServerEnv } from '@abe-stack/core/env';
```

## Contracts

API contracts are the single source of truth. Zod validates requests/responses. ts-rest generates type-safe clients.

```typescript
import {
  authContract,
  oauthContract,
  usersContract,
  realtimeContract,
  apiContract,
} from '@abe-stack/core';
import type { LoginRequest, User, AuthResponse, OAuthProvider } from '@abe-stack/core';

// Contract defines validation + types + routes
export const authContract = c.router({
  register: {
    method: 'POST',
    path: '/api/auth/register',
    body: registerRequestSchema,
    responses: { 201: registerResponseSchema, 400: errorResponseSchema },
  },
});
```

Available contracts:

- `authContract` - Register, login, magic links, password reset, email verification
- `oauthContract` - OAuth flows (initiate, callback, link, unlink)
- `usersContract` - User CRUD operations
- `adminContract` - Admin operations (unlock accounts, etc.)
- `realtimeContract` - Realtime sync/collaboration endpoints
- `apiContract` - Combined contract with all routes

## Errors

Typed error classes with HTTP mapping. Errors carry context needed for resolution.

```typescript
import {
  AppError,
  BadRequestError,
  NotFoundError,
  InvalidCredentialsError,
  mapErrorToHttpResponse,
} from '@abe-stack/core';

// Errors carry context
class EmailNotVerifiedError extends UnauthorizedError {
  constructor(public readonly email: string) {
    super('Please verify your email', 'EMAIL_NOT_VERIFIED');
  }
}

// Centralized HTTP mapping
const response = mapErrorToHttpResponse(error, logger);
// { status: 401, body: { message: '...', code: 'EMAIL_NOT_VERIFIED', email } }
```

## Validation

Zod schemas for structure, domain functions for business rules.

```typescript
import { validatePassword, WeakPasswordError } from '@abe-stack/core';

// Beyond schema validation - checks against user context
const result = await validatePassword(password, [email, name]);
if (!result.isValid) {
  throw new WeakPasswordError({ errors: result.errors });
}
```

## Pagination

Cursor encoding/decoding for both client and server.

```typescript
import { encodeCursor, decodeCursor, paginateArrayWithCursor } from '@abe-stack/core';

const cursor = encodeCursor({ id: 'abc', sortValue: 123 });
const decoded = decodeCursor(cursor);
```

## OAuth

Complete OAuth 2.0 flow with provider abstraction.

```typescript
import { oauthContract, OAUTH_PROVIDERS } from '@abe-stack/core';
import type { OAuthProvider, OAuthConnection } from '@abe-stack/core';

// Supported providers: google, github, facebook, etc.
const provider: OAuthProvider = 'google';
```

## Realtime Sync

Operational transformation system for collaborative editing.

```typescript
import {
  createTransaction,
  createSetOperation,
  createListInsertOperation,
  invertTransaction,
} from '@abe-stack/core';

const operation = createSetOperation('path.to.field', newValue, oldValue);
const transaction = createTransaction([operation], { userId: '123' });
```

## Search

Full-text search with filters, facets, and query builder.

```typescript
import { SearchQueryBuilder, filterArray, sortArray } from '@abe-stack/core';

const query = new SearchQueryBuilder()
  .search('example')
  .filter({ field: 'status', operator: 'eq', value: 'active' })
  .sort({ field: 'createdAt', order: 'desc' })
  .paginate({ limit: 20, cursor: 'abc123' })
  .build();

// Apply to arrays
const filtered = filterArray(items, query.filter);
const sorted = sortArray(filtered, query.sort);
```

## Cache

Provider-agnostic caching with memory and Redis support.

```typescript
import type { CacheProvider, CacheConfig } from '@abe-stack/core';
import { CacheError, CacheTimeoutError } from '@abe-stack/core';

// Implement your own provider
const cache: CacheProvider = {
  async get(key) {
    /* ... */
  },
  async set(key, value, options) {
    /* ... */
  },
  async delete(key) {
    /* ... */
  },
  async clear() {
    /* ... */
  },
};
```

## Notifications

Push notification system with Web Push API support.

```typescript
import {
  NOTIFICATION_TYPES,
  NOTIFICATION_PRIORITIES,
  DEFAULT_NOTIFICATION_PREFERENCES,
} from '@abe-stack/core';
import type { NotificationPayload, PushSubscription } from '@abe-stack/core';

const payload: NotificationPayload = {
  title: 'New Message',
  body: 'You have a new message',
  type: 'message',
  priority: 'high',
};
```

## Infrastructure

Generic utilities that work in any application.

```typescript
import { BatchedQueue, DeferredPromise, ReactiveMap } from '@abe-stack/core';
import { HTTP_STATUS, MS_PER_SECOND, MS_PER_MINUTE } from '@abe-stack/core';
import { parseCookies } from '@abe-stack/core';

// Async utilities
const queue = new BatchedQueue(
  async (items) => {
    // Process batch
  },
  { batchSize: 10, delayMs: 100 },
);

const deferred = new DeferredPromise<number>();
deferred.resolve(42);

// Reactive state management
const map = new ReactiveMap<string, number>();
map.subscribe((key, value) => console.log(key, value));
```

## JWT (Server-only)

Native JWT implementation using Node.js crypto.

```typescript
import { sign, verify, decode } from '@abe-stack/core/crypto';

const token = sign({ userId: '123' }, 'secret', { expiresIn: '15m' });
const payload = verify(token, 'secret');
const decoded = decode(token); // No verification
```

## Environment Validation (Server-only)

Comprehensive environment variable validation.

```typescript
import { loadServerEnv, validateEnvironment } from '@abe-stack/core/env';
import type { ServerEnv } from '@abe-stack/core';

const env = loadServerEnv(process.env);
// Validates: DATABASE_URL, JWT_SECRET, SMTP config, etc.
```

## State Stores

Custom React hook-based stores.

```typescript
import { createStore, toastStore, createUndoRedoStore } from '@abe-stack/core';

// Toast notifications
toastStore.add({ message: 'Success!', type: 'success', duration: 3000 });

// Custom stores
const useCounter = createStore<number>((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
}));

// Undo/redo
const undoStore = createUndoRedoStore();
```

## Media (Separate Package)

Media utilities are available in the `@abe-stack/media` package (server only - uses Node.js APIs).

```typescript
import {
  detectFileTypeFromFile,
  detectFileTypeFromBuffer,
  parseAudioMetadata,
  ImageProcessor,
  FFmpegWrapper,
  BasicSecurityScanner,
  validateMediaFile,
  sanitizeFilename,
} from '@abe-stack/media';

// File type detection
const fileType = await detectFileTypeFromFile('/path/to/file');

// Audio processing
const metadata = await parseAudioMetadata('/path/to/audio.mp3');

// Image processing
const processor = new ImageProcessor();
const thumbnail = await processor.createThumbnail(inputBuffer, { width: 200, height: 200 });

// FFmpeg video processing
const ffmpeg = new FFmpegWrapper('/path/to/ffmpeg');
const result = await ffmpeg.generateThumbnail('/video.mp4', '/thumb.jpg');

// Security scanning
const scanner = new BasicSecurityScanner();
const scanResult = await scanner.scanFile('/path/to/file');
```

## Project Structure

```
packages/core/src/
├── contracts/         # API contracts (Zod + ts-rest)
│   ├── auth.ts        # auth endpoints + schemas
│   ├── oauth.ts       # OAuth flow schemas
│   ├── users.ts       # user endpoints + schemas
│   ├── admin.ts       # admin operations
│   ├── realtime.ts    # realtime sync schemas
│   ├── pagination.ts  # pagination schemas
│   └── api.ts         # combined contract
├── domains/           # Business logic
│   ├── auth/          # password validation, auth errors
│   ├── cache/         # cache types, errors, providers
│   ├── search/        # search query builder, filters, operators
│   ├── notifications/ # push notification types, errors
│   └── pagination/    # cursor encoding, helpers
├── infrastructure/    # Generic utilities
│   ├── async/         # BatchedQueue, DeferredPromise, ReactiveMap
│   ├── crypto/        # JWT signing/verification
│   ├── errors/        # base error classes
│   ├── http/          # cookie parsing
│   ├── transactions/  # operation/transaction system
│   └── constants/     # HTTP status, time constants
├── stores/            # React state stores
│   ├── createStore.ts # store factory
│   ├── toastStore.ts  # toast notifications
│   └── undoRedoStore.ts # undo/redo state
├── errors/            # HTTP error mapping
├── shared/            # token storage, utilities
├── utils/             # async, port, storage utils
├── env.ts             # environment validation
└── media/             # FFmpeg, image processing (server-only)
```

## The Rule

**Domains** = business logic specific to ABE Stack.
**Infrastructure** = generic utilities (could be npm packages).

Ask: "Would this make sense in a different app?" Yes → infrastructure. No → domain.

## What Core Does NOT Do

- No databases (Drizzle, Postgres)
- No HTTP servers (Fastify, Express)
- No UI frameworks (React, hooks, JSX)
- No Node.js APIs in main export

This keeps core truly portable. Electron, React Native, service workers - all work without changes.

---

[Read the detailed docs](../../docs) for architecture decisions, development workflows, and contribution guidelines.
