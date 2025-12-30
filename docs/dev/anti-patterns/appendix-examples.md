# ABE Stack Anti-Patterns

What to avoid and how to fix common mistakes. Learn from bad examples and apply the correct patterns.

**Quick Reference:** See [CLAUDE.md](../../CLAUDE.md) for essentials.

---

## Anti-Patterns

### ❌ Anti-Pattern 1: Business Logic in Components

**This is the most common mistake. NEVER do this:**

```typescript
// ❌ BAD: Everything in one component
function OrderSummary({ items }: Props) {
  // Business logic in component - BAD
  const calculateDiscount = (item: Item) => {
    if (item.onSale) {
      if (item.category === 'electronics') {
        return item.price * 0.15; // 15% off electronics
      }
      return item.price * 0.10; // 10% off other items
    }
    return 0;
  };

  const calculateTax = (subtotal: number) => {
    const taxRate = 0.08; // 8% tax
    return subtotal * taxRate;
  };

  const total = items.reduce((sum, item) => {
    const discount = calculateDiscount(item);
    const priceAfterDiscount = item.price - discount;
    const tax = calculateTax(priceAfterDiscount);
    return sum + priceAfterDiscount + tax;
  }, 0);

  return <div>${total.toFixed(2)}</div>;
}
```

**✅ GOOD: Separated properly:**

```typescript
// ✅ GOOD: Business logic in shared package
// packages/shared/src/utils/order.ts

export const calculateDiscount = (item: Item): number => {
  if (!item.onSale) return 0;

  const discountRate = item.category === 'electronics' ? 0.15 : 0.10;
  return item.price * discountRate;
};

export const calculateTax = (subtotal: number): number => {
  const TAX_RATE = 0.08;
  return subtotal * TAX_RATE;
};

export const calculateItemTotal = (item: Item): number => {
  const discount = calculateDiscount(item);
  const subtotal = item.price - discount;
  const tax = calculateTax(subtotal);
  return subtotal + tax;
};

export const calculateOrderTotal = (items: Item[]): number => {
  return items.reduce((sum, item) => sum + calculateItemTotal(item), 0);
};

// ✅ GOOD: Component only renders
// apps/web/src/components/OrderSummary.tsx
import { calculateOrderTotal } from '@abeahn/shared';
import { formatCurrency } from '@abeahn/shared';

function OrderSummary({ items }: Props) {
  const total = calculateOrderTotal(items);

  return (
    <div className="order-summary">
      <h3>Order Total</h3>
      <p className="total">{formatCurrency(total)}</p>
    </div>
  );
}
```

### ❌ Anti-Pattern 2: Duplicate Type Definitions

```typescript
// ❌ BAD: Types defined in multiple places
// apps/web/src/types/user.ts
export interface User {
  id: string;
  email: string;
  name: string;
}

// apps/server/src/types/user.ts
export interface User {
  id: string;
  email: string;
  name: string;
}

// packages/api-client/src/types.ts
export interface User {
  id: string;
  email: string;
  name: string;
}

// ✅ GOOD: Single source of truth
// packages/shared/src/types/user.ts
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin';
  createdAt: Date;
  updatedAt: Date;
}

// Everyone imports from shared
import { User } from '@abeahn/shared';
```

### ❌ Anti-Pattern 3: Cross-App Imports

```typescript
// ❌ BAD: Importing from another app
// apps/web/src/components/UserList.tsx
import { formatUserName } from '../../../server/src/utils/user';

// ❌ BAD: Importing from desktop app
import { Settings } from '../../../desktop/src/config';

// ✅ GOOD: Import from shared package
import { formatUserName } from '@abeahn/shared';
```

### ❌ Anti-Pattern 4: Prop Drilling

```typescript
// ❌ BAD: Passing props through many layers
function App() {
  const [user, setUser] = useState<User | null>(null);

  return <Layout user={user} setUser={setUser} />;
}

function Layout({ user, setUser }: Props) {
  return <Sidebar user={user} setUser={setUser} />;
}

function Sidebar({ user, setUser }: Props) {
  return <UserMenu user={user} setUser={setUser} />;
}

function UserMenu({ user, setUser }: Props) {
  // Finally use the props here
  return <div>{user?.name}</div>;
}

// ✅ GOOD: Use React Query at the component level
function UserMenu() {
  const { data: user } = useCurrentUser();
  const updateUser = useUpdateUser();

  return (
    <div>
      <p>{user?.name}</p>
      <button onClick={() => updateUser.mutate({ name: 'New Name' })}>
        Update
      </button>
    </div>
  );
}
```

### ❌ Anti-Pattern 5: Using Any

```typescript
// ❌ BAD: Using 'any' defeats type safety
function processData(data: any) {
  return data.items.map((item: any) => ({
    id: item.id,
    name: item.name,
  }));
}

// ✅ GOOD: Proper types with Zod validation
const dataSchema = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
    }),
  ),
});

type Data = z.infer<typeof dataSchema>;

function processData(data: unknown): Array<{ id: string; name: string }> {
  const validated = dataSchema.parse(data);
  return validated.items.map((item) => ({
    id: item.id,
    name: item.name,
  }));
}
```

---
