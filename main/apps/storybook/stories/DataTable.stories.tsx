// main/apps/storybook/stories/DataTable.stories.tsx
/**
 * Data Table Patterns
 *
 * Common data table layouts with sorting, filtering, pagination, and actions.
 */
import {
  Badge,
  Button,
  Card,
  Container,
  Heading,
  Input,
  Pagination,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Text,
} from '@bslt/ui';
import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';

const meta: Meta = {
  title: 'Patterns/DataTable',
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <Container size="lg" style={{ padding: 'var(--ui-gap-xl) 0' }}>
        <Story />
      </Container>
    ),
  ],
};
export default meta;

type Story = StoryObj;

/** Sample user data */
const sampleUsers = [
  { id: '1', name: 'Alice Johnson', email: 'alice@example.com', role: 'Admin', status: 'active' },
  { id: '2', name: 'Bob Smith', email: 'bob@example.com', role: 'User', status: 'active' },
  { id: '3', name: 'Carol Williams', email: 'carol@example.com', role: 'User', status: 'inactive' },
  { id: '4', name: 'David Brown', email: 'david@example.com', role: 'Viewer', status: 'active' },
  { id: '5', name: 'Eve Davis', email: 'eve@example.com', role: 'Admin', status: 'active' },
  { id: '6', name: 'Frank Miller', email: 'frank@example.com', role: 'User', status: 'suspended' },
  { id: '7', name: 'Grace Wilson', email: 'grace@example.com', role: 'User', status: 'active' },
  { id: '8', name: 'Henry Moore', email: 'henry@example.com', role: 'Viewer', status: 'active' },
];

function statusTone(status: string): 'success' | 'danger' | 'warning' | 'info' {
  switch (status) {
    case 'active':
      return 'success';
    case 'inactive':
      return 'warning';
    case 'suspended':
      return 'danger';
    default:
      return 'info';
  }
}

export const BasicTable: Story = {
  render: () => (
    <Card>
      <Card.Header>
        <Heading as="h2" size="md">
          Users
        </Heading>
      </Card.Header>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sampleUsers.map((user) => (
            <TableRow key={user.id}>
              <TableCell>{user.name}</TableCell>
              <TableCell>{user.email}</TableCell>
              <TableCell>
                <Badge tone="info">{user.role}</Badge>
              </TableCell>
              <TableCell>
                <Badge tone={statusTone(user.status)}>{user.status}</Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  ),
};

export const TableWithPagination: Story = {
  render: function TableWithPaginationStory() {
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');

    const filtered = sampleUsers.filter((u) => {
      const matchesSearch =
        search === '' ||
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase());
      const matchesRole = roleFilter === 'all' || u.role === roleFilter;
      return matchesSearch && matchesRole;
    });

    const pageSize = 3;
    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

    return (
      <Card>
        <Card.Header>
          <Heading as="h2" size="md">
            User Management
          </Heading>
        </Card.Header>
        <Card.Body>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 'var(--ui-gap-md)',
              alignItems: 'flex-end',
              marginBottom: 'var(--ui-gap-md)',
            }}
          >
            <div style={{ flex: '1 1 12rem' }}>
              <Input
                placeholder="Search by name or email..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                aria-label="Search users"
              />
            </div>
            <div style={{ minWidth: '8rem' }}>
              <Select
                value={roleFilter}
                onChange={(v) => {
                  setRoleFilter(v);
                  setPage(1);
                }}
              >
                <option value="all">All Roles</option>
                <option value="Admin">Admin</option>
                <option value="User">User</option>
                <option value="Viewer">Viewer</option>
              </Select>
            </div>
          </div>
        </Card.Body>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paged.length > 0 ? (
              paged.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Badge tone="info">{user.role}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge tone={statusTone(user.status)}>{user.status}</Badge>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} style={{ textAlign: 'center' }}>
                  <Text tone="muted">No users match the current filters.</Text>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <Card.Footer>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              width: '100%',
            }}
          >
            <Text tone="muted" style={{ fontSize: 'var(--ui-font-size-sm)' }}>
              {String(filtered.length)} result{filtered.length !== 1 ? 's' : ''}
            </Text>
            <Pagination value={page} totalPages={totalPages} onChange={setPage} />
          </div>
        </Card.Footer>
      </Card>
    );
  },
};

export const TableWithActions: Story = {
  render: () => (
    <Card>
      <Card.Header>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Heading as="h2" size="md">
            Team Members
          </Heading>
          <Button variant="primary" size="small">
            Add Member
          </Button>
        </div>
      </Card.Header>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Status</TableHead>
            <TableHead style={{ textAlign: 'right' }}>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sampleUsers.slice(0, 5).map((user) => (
            <TableRow key={user.id}>
              <TableCell>{user.name}</TableCell>
              <TableCell>{user.email}</TableCell>
              <TableCell>
                <Badge tone="info">{user.role}</Badge>
              </TableCell>
              <TableCell>
                <Badge tone={statusTone(user.status)}>{user.status}</Badge>
              </TableCell>
              <TableCell style={{ textAlign: 'right' }}>
                <div
                  style={{ display: 'flex', gap: 'var(--ui-gap-xs)', justifyContent: 'flex-end' }}
                >
                  <Button variant="text" size="small">
                    Edit
                  </Button>
                  <Button variant="text" size="small">
                    Remove
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  ),
};

export const SortableTable: Story = {
  render: function SortableTableStory() {
    const [sortField, setSortField] = useState<'name' | 'email' | 'role'>('name');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

    const sorted = [...sampleUsers].sort((a, b) => {
      const av = a[sortField];
      const bv = b[sortField];
      return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
    });

    const handleSort = (field: 'name' | 'email' | 'role') => {
      if (sortField === field) {
        setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
      } else {
        setSortField(field);
        setSortDir('asc');
      }
    };

    const sortIndicator = (field: string) =>
      sortField === field ? (sortDir === 'asc' ? ' \u2191' : ' \u2193') : '';

    return (
      <Card>
        <Card.Header>
          <Heading as="h2" size="md">
            Sortable Table
          </Heading>
          <Text tone="muted" style={{ fontSize: 'var(--ui-font-size-sm)' }}>
            Click column headers to sort.
          </Text>
        </Card.Header>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead
                style={{ cursor: 'pointer' }}
                onClick={() => { handleSort('name'); }}
              >
                Name{sortIndicator('name')}
              </TableHead>
              <TableHead
                style={{ cursor: 'pointer' }}
                onClick={() => { handleSort('email'); }}
              >
                Email{sortIndicator('email')}
              </TableHead>
              <TableHead
                style={{ cursor: 'pointer' }}
                onClick={() => { handleSort('role'); }}
              >
                Role{sortIndicator('role')}
              </TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((user) => (
              <TableRow key={user.id}>
                <TableCell>{user.name}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <Badge tone="info">{user.role}</Badge>
                </TableCell>
                <TableCell>
                  <Badge tone={statusTone(user.status)}>{user.status}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    );
  },
};

export const EmptyTable: Story = {
  render: () => (
    <Card>
      <Card.Header>
        <Heading as="h2" size="md">
          Search Results
        </Heading>
      </Card.Header>
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
            <TableCell colSpan={3} style={{ textAlign: 'center', padding: 'var(--ui-gap-xl)' }}>
              <Text tone="muted">No results found. Try adjusting your search.</Text>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </Card>
  ),
};
