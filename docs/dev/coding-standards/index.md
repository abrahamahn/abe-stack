# ABE Stack Coding Standards

Comprehensive coding standards including TypeScript usage, naming conventions, import order, error handling, and code documentation.

**Quick Reference:** See [CLAUDE.md](../../CLAUDE.md) for essentials.

Quick Summary:

- Strict TypeScript, no `any` without justification.
- Validate inputs at boundaries with Zod.
- Favor clarity and explicit error handling.

## Modules

- None. This page is the canonical coding standards reference.

## Key Patterns/Commands

| Name             | Description                | Link                    |
| ---------------- | -------------------------- | ----------------------- |
| TypeScript rules | Strict typing expectations | `#typescript-standards` |
| Error handling   | Required error patterns    | `#error-handling`       |
| Naming           | File and symbol naming     | `#file-naming`          |

See Also:

- `dev/patterns/index.md`
- `dev/anti-patterns/index.md`

---

## Coding Standards

### TypeScript Standards

**Use strict mode.** No `any`, no `@ts-ignore` without explanation.

**Bad:**

```typescript
// ❌ BAD: Using 'any' defeats type safety
const data: any = await fetchUser();
const name = data.name; // No type checking!
```

**Good:**

```typescript
// ✅ GOOD: Proper types with runtime validation
import { z } from 'zod';

const userSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string(),
  role: z.enum(['user', 'admin']),
});

type User = z.infer<typeof userSchema>;

const data = await fetchUser();
const user = userSchema.parse(data); // Runtime validation + compile-time types
```

### Error Handling

**Always handle errors explicitly.**

**Bad:**

```typescript
// ❌ BAD: No error handling
const user = await fetchUser(id);
return reply.send({ user });
```

**Good (Server):**

```typescript
// ✅ GOOD: Comprehensive error handling
try {
  const user = await fetchUser(id);
  return reply.code(200).send({ user });
} catch (error) {
  if (error instanceof NotFoundError) {
    return reply.code(404).send({
      error: 'User not found',
      code: 'USER_NOT_FOUND',
    });
  }
  if (error instanceof ValidationError) {
    return reply.code(400).send({
      error: error.message,
      code: 'VALIDATION_ERROR',
      fields: error.fields,
    });
  }
  // Log unexpected errors
  request.log.error(error, 'Failed to fetch user');
  return reply.code(500).send({
    error: 'Internal server error',
    code: 'INTERNAL_ERROR',
  });
}
```

**Good (Client):**

```typescript
// ✅ GOOD: React Query error handling
const { data: user, error, isLoading } = useUser(id);

if (error) {
  // Show user-friendly error message
  return <ErrorMessage error={error} />;
}

if (isLoading) {
  return <Spinner />;
}

// TypeScript knows user is defined here
return <UserProfile user={user} />;
```

### File Naming

```
PascalCase → Components, Classes, Types
  ├── UserProfile.tsx
  ├── Button.tsx
  ├── ApiClient.ts
  └── User.ts

camelCase → Functions, variables, hooks, utilities
  ├── formatCurrency.ts
  ├── useUser.ts
  ├── apiClient.ts
  └── validateEmail.ts

kebab-case → Configuration files
  ├── vite.config.ts
  ├── tsconfig.json
  ├── .env.development
  └── .eslintrc.json
```

### Import Order

**ALWAYS organize imports in this order:**

```typescript
// 1. External dependencies (alphabetical)
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';

// 2. Internal packages (alphabetical)
import { formatUserName, isUserAdmin } from '@abe-stack/shared';
import { Button, Card } from '@abe-stack/ui';
import { useUser } from '@abe-stack/api-client';

// 3. Relative imports (grouped by distance from current file)
import { useAuth } from '../../hooks/useAuth';
import { UserCard } from '../UserCard';
import { UserBadge } from './UserBadge';

// 4. Styles (always last)
import './UserProfile.css';
```

### Code Documentation

**Write self-documenting code, add comments for "why" not "what":**

```typescript
// ❌ BAD: Comment states the obvious
// Loop through users
for (const user of users) {
  // Check if user is active
  if (user.isActive) {
    // Send email
    sendEmail(user.email);
  }
}

// ✅ GOOD: Comment explains the reasoning
// Only notify users who opted in during the last 30 days
// to comply with GDPR consent expiration
for (const user of users) {
  if (user.isActive && user.consentDate > thirtyDaysAgo) {
    sendEmail(user.email);
  }
}
```

---
