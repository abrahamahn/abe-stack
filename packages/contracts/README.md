# @abe-stack/contracts

Shared API type definitions and contracts for ABE Stack.

## Purpose

This package contains TypeScript interfaces, Zod schemas, and API contracts that are shared between:

- **Frontend** (apps/web, apps/desktop)
- **Backend** (apps/server)
- **UI Components** (packages/ui)

## What's Included

- **API Contracts** - Type-safe API definitions
- **Domain Types** - User, Auth, Billing, Admin, etc.
- **Validation Schemas** - Zod schemas for runtime validation
- **Service Interfaces** - Logger, EmailService, StorageService, etc.
- **Pagination Types** - Pagination options and result types

## Usage

### Frontend

````typescript
import { User, AuthResponse, PaginationOptions } from '@abe-stack/contracts';

// Use types for API calls
### In Frontend

```typescript
import { loginRequestSchema, type LoginRequest, type AuthResponse } from '@abe-stack/contracts';

const loginData: LoginRequest = {
  email: 'user@example.com',
  password: 'password123',
};

const response = await fetch('/api/auth/login', {
  method: 'POST',
  body: JSON.stringify(loginData),
});

const data: AuthResponse = await response.json();
````

### In Backend

```typescript
import { loginRequestSchema, type LoginRequest } from '@abe-stack/contracts';

export const loginHandler = async (req: Request) => {
  // Validate request against schema
  const result = loginRequestSchema.safeParse(req.body);

  if (!result.success) {
    return { error: 'Invalid request' };
  }

  const loginData: LoginRequest = result.data;
  // ... handle login
};
```

### In UI Components

```typescript
import { type User } from '@abe-stack/contracts';

interface UserCardProps {
  user: User;
}

export function UserCard({ user }: UserCardProps) {
  return <div>{user.name}</div>;
}
```

## Structure

````
src/

```bash
# Type check
pnpm type-check

# Build
pnpm build
````

## Related Packages

- `@abe-stack/core` - Backend utilities and implementations
- `@abe-stack/ui` - UI components
- `@abe-stack/db` - Database utilities
