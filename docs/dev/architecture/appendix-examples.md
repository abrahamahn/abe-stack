# Architecture Appendix: Examples

## Presentation vs Business Logic

```typescript
// BAD: business logic in component
function UserProfile({ userId }: Props) {
  useEffect(() => {
    fetch(`/api/users/${userId}`)
      .then((res) => res.json())
      .then((data) => {
        const fullName = `${data.firstName} ${data.lastName}`;
        setUser({ ...data, fullName });
      });
  }, [userId]);

  return <div>{user?.fullName}</div>;
}
```

```typescript
// GOOD: component renders, logic in shared
function UserProfile({ userId }: Props) {
  const { data: user, isLoading } = useUser(userId);
  if (isLoading) return <Spinner />;
  if (!user) return <NotFound />;

  const fullName = formatUserName(user.firstName, user.lastName);
  return <div>{fullName}</div>;
}
```

## API Client Split

```typescript
// packages/api-client/src/client.ts
export const apiClient = initClient(contract, { baseUrl: ... });

// packages/api-client/src/react-query.ts
export const useUser = (id: string) => useQuery({ ... });
```

## Import Order

```typescript
import React from 'react';
import { z } from 'zod';

import { formatUserName } from '@abeahn/shared';
import { Button } from '@abeahn/ui';

import { useAuth } from '../../hooks/useAuth';
import './UserProfile.css';
```

## Env Schema

```typescript
export const serverEnvSchema = z.object({
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
});
```
