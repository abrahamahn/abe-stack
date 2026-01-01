# Table

## Overview

A composable table component with semantic HTML elements and responsive styling. Exports individual components for building accessible data tables.

## Import

```tsx
import {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableRow,
  TableHead,
  TableCell,
  TableCaption,
} from 'abeahn-ui/elements';
```

## Components

| Component      | Element     | Description                                      |
| -------------- | ----------- | ------------------------------------------------ |
| `Table`        | `<table>`   | Main table container (wrapped in responsive div) |
| `TableHeader`  | `<thead>`   | Table header section                             |
| `TableBody`    | `<tbody>`   | Table body section                               |
| `TableFooter`  | `<tfoot>`   | Table footer section                             |
| `TableRow`     | `<tr>`      | Table row                                        |
| `TableHead`    | `<th>`      | Header cell                                      |
| `TableCell`    | `<td>`      | Data cell                                        |
| `TableCaption` | `<caption>` | Table caption/title                              |

All components:

- Forward refs
- Accept all standard HTML attributes for their respective elements
- Accept `className` for additional styling
- Use semantic HTML elements for accessibility

## Usage

### Basic Example

```tsx
<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Name</TableHead>
      <TableHead>Email</TableHead>
      <TableHead>Role</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow>
      <TableCell>John Doe</TableCell>
      <TableCell>john@example.com</TableCell>
      <TableCell>Admin</TableCell>
    </TableRow>
    <TableRow>
      <TableCell>Jane Smith</TableCell>
      <TableCell>jane@example.com</TableCell>
      <TableCell>User</TableCell>
    </TableRow>
  </TableBody>
</Table>
```

### With Caption

```tsx
<Table>
  <TableCaption>User Directory</TableCaption>
  <TableHeader>
    <TableRow>
      <TableHead>Name</TableHead>
      <TableHead>Status</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow>
      <TableCell>Alice</TableCell>
      <TableCell>Active</TableCell>
    </TableRow>
  </TableBody>
</Table>
```

### With Footer

```tsx
<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Product</TableHead>
      <TableHead>Price</TableHead>
      <TableHead>Quantity</TableHead>
      <TableHead>Total</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow>
      <TableCell>Widget A</TableCell>
      <TableCell>$10.00</TableCell>
      <TableCell>2</TableCell>
      <TableCell>$20.00</TableCell>
    </TableRow>
    <TableRow>
      <TableCell>Widget B</TableCell>
      <TableCell>$15.00</TableCell>
      <TableCell>1</TableCell>
      <TableCell>$15.00</TableCell>
    </TableRow>
  </TableBody>
  <TableFooter>
    <TableRow>
      <TableCell colSpan={3} style={{ fontWeight: 'bold' }}>
        Total
      </TableCell>
      <TableCell style={{ fontWeight: 'bold' }}>$35.00</TableCell>
    </TableRow>
  </TableFooter>
</Table>
```

### Dynamic Data

```tsx
const users = [
  { id: 1, name: 'John', email: 'john@example.com', role: 'Admin' },
  { id: 2, name: 'Jane', email: 'jane@example.com', role: 'User' },
];

<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Name</TableHead>
      <TableHead>Email</TableHead>
      <TableHead>Role</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {users.map((user) => (
      <TableRow key={user.id}>
        <TableCell>{user.name}</TableCell>
        <TableCell>{user.email}</TableCell>
        <TableCell>{user.role}</TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>;
```

### With Actions

```tsx
<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Name</TableHead>
      <TableHead>Status</TableHead>
      <TableHead>Actions</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {items.map((item) => (
      <TableRow key={item.id}>
        <TableCell>{item.name}</TableCell>
        <TableCell>{item.status}</TableCell>
        <TableCell>
          <button onClick={() => handleEdit(item)}>Edit</button>
          <button onClick={() => handleDelete(item)}>Delete</button>
        </TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>
```

### Sortable Headers

```tsx
const [sortBy, setSortBy] = useState<'name' | 'date'>('name');
const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

<Table>
  <TableHeader>
    <TableRow>
      <TableHead>
        <button onClick={() => handleSort('name')}>
          Name {sortBy === 'name' && (sortDir === 'asc' ? '↑' : '↓')}
        </button>
      </TableHead>
      <TableHead>
        <button onClick={() => handleSort('date')}>
          Date {sortBy === 'date' && (sortDir === 'asc' ? '↑' : '↓')}
        </button>
      </TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {sortedData.map((row) => (
      <TableRow key={row.id}>
        <TableCell>{row.name}</TableCell>
        <TableCell>{row.date}</TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>;
```

### With Scroll (Long Tables)

```tsx
<ScrollArea maxHeight="400px">
  <Table>
    <TableHeader>
      <TableRow>
        <TableHead>Column 1</TableHead>
        <TableHead>Column 2</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {manyRows.map((row) => (
        <TableRow key={row.id}>
          <TableCell>{row.col1}</TableCell>
          <TableCell>{row.col2}</TableCell>
        </TableRow>
      ))}
    </TableBody>
  </Table>
</ScrollArea>
```

### Empty State

```tsx
<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Name</TableHead>
      <TableHead>Email</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {data.length === 0 ? (
      <TableRow>
        <TableCell colSpan={2} style={{ textAlign: 'center' }}>
          No data available
        </TableCell>
      </TableRow>
    ) : (
      data.map((row) => (
        <TableRow key={row.id}>
          <TableCell>{row.name}</TableCell>
          <TableCell>{row.email}</TableCell>
        </TableRow>
      ))
    )}
  </TableBody>
</Table>
```

## Accessibility

- Uses semantic HTML table elements
- `<th>` elements in header for proper screen reader navigation
- `scope` attribute can be added to `<th>` for complex tables
- Table wrapped in responsive container
- Caption provides context for screen readers

### Enhanced Accessibility

```tsx
<Table>
  <TableCaption>Monthly sales report for Q4 2024</TableCaption>
  <TableHeader>
    <TableRow>
      <TableHead scope="col">Month</TableHead>
      <TableHead scope="col">Revenue</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow>
      <TableHead scope="row">October</TableHead>
      <TableCell>$50,000</TableCell>
    </TableRow>
  </TableBody>
</Table>
```

## Do's and Don'ts

### Do

- Use for tabular data
- Provide descriptive headers
- Use `TableCaption` for context
- Add `scope` attribute to headers for complex tables
- Handle empty states gracefully
- Consider mobile responsiveness
- Use with ScrollArea for long tables

### Don't

- Don't use tables for layout (use CSS Grid/Flexbox)
- Don't omit headers
- Don't create overly complex nested tables
- Don't forget to handle overflow on mobile
- Don't put too much content in cells (keep scannable)

## Responsive Behavior

The Table component is wrapped in `.ui-table-container` which provides:

- Horizontal scroll on smaller screens
- Maintains table structure
- Prevents layout breaking

For better mobile experience, consider:

- Responsive card view for mobile
- Collapsible rows
- Horizontal scroll with indicators
- Hide non-essential columns

## Related Components

- [ScrollArea](./ScrollArea.md) - For long tables
- [Pagination](./Pagination.md) - For large datasets

## References

- [Source](../../src/elements/Table.tsx)
- [Tests](../../src/elements/__tests__/Table.test.tsx)
- [MDN: table element](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/table)
- [WCAG: Tables](https://www.w3.org/WAI/tutorials/tables/)
