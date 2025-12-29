# Testing Examples

## Unit Test Example

```typescript
import { describe, it, expect } from 'vitest';
import { formatCurrency } from '../currency';

describe('formatCurrency', () => {
  it('formats USD', () => {
    expect(formatCurrency(1234.56, 'USD')).toBe('$1,234.56');
  });
});
```

## Contract Test Example

```typescript
const response = await app.inject({
  method: 'POST',
  url: '/api/users',
  payload: { email: 'test@example.com', password: 'Pass1234' },
});
expect(response.statusCode).toBe(201);
```
