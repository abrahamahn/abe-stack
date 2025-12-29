# ABE Stack Common Patterns

Common implementation patterns with full examples for API clients, forms, environment variables, database queries, and more.

**Quick Reference:** See [CLAUDE.md](../../CLAUDE.md) for essentials.

---

## Common Patterns

### Pattern 1: API Client

**Framework-agnostic client + React-specific hooks:**

```typescript
// packages/api-client/src/client.ts (framework-agnostic)
import { initClient } from '@ts-rest/core';
import { contract } from '@abe-stack/shared/contracts';

export const apiClient = initClient(contract, {
  baseUrl: import.meta.env.VITE_API_URL || 'http://localhost:3000',
  baseHeaders: {
    'Content-Type': 'application/json',
  },
});

// packages/api-client/src/react-query.ts (React-specific)
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './client';

export const useUser = (id: string) => {
  return useQuery({
    queryKey: ['user', id],
    queryFn: async () => {
      const response = await apiClient.users.get({ params: { id } });
      if (response.status !== 200) {
        throw new Error(response.body.error || 'Failed to fetch user');
      }
      return response.body;
    },
    enabled: !!id, // Only run if id is provided
  });
};

export const useCreateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateUserInput) => {
      const response = await apiClient.users.create({ body: data });
      if (response.status !== 201) {
        throw new Error(response.body.error || 'Failed to create user');
      }
      return response.body;
    },
    onSuccess: () => {
      // Invalidate users list to refetch
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
};
```

### Pattern 2: Form Handling

**Validation-first forms with Zod:**

```typescript
// packages/shared/src/validation/user.ts
import { z } from 'zod';

export const createUserSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain uppercase letter')
    .regex(/[0-9]/, 'Password must contain number'),
  name: z.string()
    .min(1, 'Name is required')
    .max(100, 'Name too long'),
  organizationId: z.string().uuid('Invalid organization ID'),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;

// apps/web/src/components/CreateUserForm.tsx
import { useState } from 'react';
import { createUserSchema, type CreateUserInput } from '@abe-stack/shared';
import { useCreateUser } from '@abe-stack/api-client';

function CreateUserForm() {
  const [formData, setFormData] = useState<CreateUserInput>({
    email: '',
    password: '',
    name: '',
    organizationId: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const createUser = useCreateUser();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validate with Zod
    const result = createUserSchema.safeParse(formData);

    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      setErrors(
        Object.entries(fieldErrors).reduce(
          (acc, [key, value]) => ({
            ...acc,
            [key]: value?.[0] || 'Invalid value',
          }),
          {}
        )
      );
      return;
    }

    // API call with validated data
    try {
      await createUser.mutateAsync(result.data);
      // Success! Form will reset via mutation success handler
    } catch (error) {
      setErrors({ submit: 'Failed to create user' });
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        />
        {errors.email && <span className="error">{errors.email}</span>}
      </div>

      {/* More fields... */}

      {errors.submit && <div className="error">{errors.submit}</div>}

      <button type="submit" disabled={createUser.isPending}>
        {createUser.isPending ? 'Creating...' : 'Create User'}
      </button>
    </form>
  );
}
```

### Pattern 3: Environment Variables

**Type-safe environment variables with Zod:**

```typescript
// packages/shared/src/env.ts
import { z } from 'zod';

// Define schema for environment variables
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  API_PORT: z.string().transform(Number).pipe(z.number().min(1024)),
  REDIS_URL: z.string().url().optional(),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

// Parse and validate environment variables
export const env = envSchema.parse(process.env);

// TypeScript knows the exact types now:
// env.NODE_ENV is 'development' | 'production' | 'test'
// env.API_PORT is number
// env.REDIS_URL is string | undefined

// apps/server/src/index.ts
import { env } from '@abe-stack/shared';

const server = Fastify({
  logger: {
    level: env.LOG_LEVEL,
    // Pretty print in development
    transport:
      env.NODE_ENV === 'development'
        ? {
            target: 'pino-pretty',
          }
        : undefined,
  },
});

await server.listen({
  port: env.API_PORT,
  host: '0.0.0.0',
});
```

### Pattern 4: Database Queries

**Drizzle ORM with type-safe queries:**

```typescript
// packages/db/queries/users.ts
import { eq, and, desc } from 'drizzle-orm';
import { db } from '../client';
import { users } from '../schema/users';

export const userQueries = {
  findById: async (id: string) => {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);

    return result[0] || null;
  },

  findByEmail: async (email: string) => {
    const result = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);

    return result[0] || null;
  },

  findActiveByOrganization: async (organizationId: string) => {
    return db
      .select()
      .from(users)
      .where(and(eq(users.organizationId, organizationId), eq(users.isActive, true)))
      .orderBy(desc(users.createdAt));
  },

  create: async (data: NewUser) => {
    const result = await db.insert(users).values(data).returning();

    return result[0];
  },

  update: async (id: string, data: Partial<User>) => {
    const result = await db
      .update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();

    return result[0] || null;
  },

  delete: async (id: string) => {
    await db.delete(users).where(eq(users.id, id));
  },
};
```

---
