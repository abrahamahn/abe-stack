# Performance Optimization

Performance optimization workflows have been migrated to the `performance-optimizer` agent.

## Quick Reference

Use `/agent performance-optimizer` for optimization tasks.

## Database Performance

**N+1 Query Fix:**
```typescript
// BAD: Loop with individual queries
const users = await db.select().from(usersTable);
const usersWithOrgs = await Promise.all(
  users.map(async (user) => {
    const org = await db.select().from(organizations)
      .where(eq(organizations.id, user.organizationId));
    return { ...user, organization: org[0] };
  })
);

// GOOD: JOIN
return db.select().from(usersTable)
  .leftJoin(organizations, eq(usersTable.organizationId, organizations.id));

// GOOD: Batch with IN clause
const orgs = await db.select().from(organizations)
  .where(inArray(organizations.id, orgIds));
```

## Frontend Performance

**Code splitting:**
```typescript
const Dashboard = lazy(() => import('./pages/Dashboard'));
```

**React Query optimization:**
```typescript
useQuery({
  queryKey: ['user', id],
  staleTime: 5 * 60 * 1000,  // 5 min
  cacheTime: 10 * 60 * 1000, // 10 min
});
```

## See Also

- `/agent performance-optimizer` - Full optimization workflow
- `architecture.md` - System design
