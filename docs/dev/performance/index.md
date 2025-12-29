# ABE Stack Performance Optimization

Techniques and best practices for optimizing database queries, frontend performance, and overall application speed.

**Quick Reference:** See [CLAUDE.md](../CLAUDE.md) for essentials.

---

## Performance Optimization

### Database Performance

**Identify N+1 queries:**

```typescript
// ❌ BAD: N+1 query problem
async function getUsersWithOrganizations() {
  const users = await db.select().from(usersTable);

  // This runs a query for EACH user!
  const usersWithOrgs = await Promise.all(
    users.map(async (user) => {
      const org = await db
        .select()
        .from(organizations)
        .where(eq(organizations.id, user.organizationId));

      return { ...user, organization: org[0] };
    }),
  );

  return usersWithOrgs;
}

// ✅ GOOD: Single query with join
async function getUsersWithOrganizations() {
  return db
    .select()
    .from(usersTable)
    .leftJoin(organizations, eq(usersTable.organizationId, organizations.id));
}

// ✅ ALSO GOOD: Batch loading with IN clause
async function getUsersWithOrganizations() {
  const users = await db.select().from(usersTable);
  const orgIds = users.map((u) => u.organizationId);

  const orgs = await db.select().from(organizations).where(inArray(organizations.id, orgIds));

  const orgMap = new Map(orgs.map((o) => [o.id, o]));

  return users.map((user) => ({
    ...user,
    organization: orgMap.get(user.organizationId),
  }));
}
```

**Add indexes for frequently queried columns:**

```typescript
// packages/db/schema/users.ts
import { pgTable, uuid, text, timestamp, index } from 'drizzle-orm/pg-core';

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: text('email').notNull().unique(),
    organizationId: uuid('organization_id').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    // Add index for foreign key lookups
    organizationIdx: index('users_organization_idx').on(table.organizationId),
    // Add index for common queries
    createdAtIdx: index('users_created_at_idx').on(table.createdAt),
  }),
);
```

### Frontend Performance

**Code splitting:**

```typescript
// ✅ GOOD: Lazy load routes
import { lazy, Suspense } from 'react';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Settings = lazy(() => import('./pages/Settings'));

function App() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </Suspense>
  );
}
```

**Optimize React Query:**

```typescript
// ✅ GOOD: Proper staleTime and cacheTime
export const useUser = (id: string) => {
  return useQuery({
    queryKey: ['user', id],
    queryFn: () => apiClient.users.get({ params: { id } }),
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
    enabled: !!id,
  });
};
```

---
