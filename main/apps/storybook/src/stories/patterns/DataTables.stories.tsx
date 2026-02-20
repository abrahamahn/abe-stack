// main/apps/storybook/src/stories/patterns/DataTables.stories.tsx
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
  title: 'Patterns/DataTables',
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

export const TableWithFilterAndPagination: Story = {
  render: function TableWithFilterAndPaginationStory() {
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

export const CompactTable: Story = {
  render: () => (
    <Card>
      <Card.Header>
        <Heading as="h2" size="sm">
          Recent Activity
        </Heading>
      </Card.Header>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Action</TableHead>
            <TableHead>User</TableHead>
            <TableHead>Time</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {[
            { action: 'Uploaded file', user: 'Alice', time: '2 min ago' },
            { action: 'Deleted item', user: 'Bob', time: '15 min ago' },
            { action: 'Updated settings', user: 'Carol', time: '1 hour ago' },
            { action: 'Created project', user: 'David', time: '3 hours ago' },
            { action: 'Invited member', user: 'Eve', time: 'Yesterday' },
          ].map((entry, i) => (
            <TableRow key={i}>
              <TableCell>
                <Text style={{ fontSize: 'var(--ui-font-size-sm)' }}>{entry.action}</Text>
              </TableCell>
              <TableCell>
                <Text style={{ fontSize: 'var(--ui-font-size-sm)' }}>{entry.user}</Text>
              </TableCell>
              <TableCell>
                <Text tone="muted" style={{ fontSize: 'var(--ui-font-size-sm)' }}>
                  {entry.time}
                </Text>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  ),
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
