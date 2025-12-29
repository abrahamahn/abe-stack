# Testing Examples

## Unit Test Example

```typescript
import { describe, it, expect } from 'vitest';
import { formatCurrency } from '../currency';

describe('formatCurrency', () => {
  it('formats USD', () => {
    expect(formatCurrency(1234.56, 'USD')).toBe('$1,234.56');
  });

  it('returns a safe fallback for invalid values', () => {
    expect(formatCurrency(Number.NaN, 'USD')).toBe('NaN');
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

## TDD Example (Fail First)

```typescript
import { describe, it, expect } from 'vitest';
import { parsePageSize } from '../pagination';

describe('parsePageSize', () => {
  it('rejects zero and negative values', () => {
    expect(() => parsePageSize(0)).toThrow(/page size/i);
    expect(() => parsePageSize(-1)).toThrow(/page size/i);
  });
});
```
