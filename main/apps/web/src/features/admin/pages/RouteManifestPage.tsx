// main/apps/web/src/features/admin/pages/RouteManifestPage.tsx
/**
 * RouteManifestPage
 *
 * Admin page showing all registered API routes with filtering.
 */

import {
  Badge,
  Checkbox,
  Heading,
  Input,
  PageContainer,
  Select,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Text,
} from '@abe-stack/ui';
import { useMemo, useState } from 'react';

import { useRouteManifest } from '../hooks/useRouteManifest';

import type { JSX } from 'react';

interface RouteEntry {
  path: string;
  method: string;
  isPublic: boolean;
  roles: string[];
  hasSchema: boolean;
  module: string;
}

type MethodFilter = 'ALL' | 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

const METHOD_TONES: Record<string, 'success' | 'info' | 'warning' | 'danger'> = {
  GET: 'success',
  POST: 'info',
  PUT: 'warning',
  PATCH: 'warning',
  DELETE: 'danger',
};

const ALL_METHODS: readonly MethodFilter[] = ['ALL', 'GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

function isMethodFilter(value: string): value is MethodFilter {
  return ALL_METHODS.includes(value as MethodFilter);
}

function MethodBadge({ method }: { method: string }): JSX.Element {
  return (
    <Badge
      tone={METHOD_TONES[method] ?? 'info'}
      className="font-semibold text-[0.7rem] min-w-16 text-center"
    >
      {method}
    </Badge>
  );
}

function AuthBadge({ isPublic, roles }: { isPublic: boolean; roles: string[] }): JSX.Element {
  if (isPublic) return <Badge tone="success">Public</Badge>;
  if (roles.length > 0) return <Badge tone="warning">{roles.join(', ')}</Badge>;
  return <Badge tone="danger">Auth</Badge>;
}

export const RouteManifestPage = (): JSX.Element => {
  const [search, setSearch] = useState('');
  const [moduleFilter, setModuleFilter] = useState('ALL');
  const [methodFilter, setMethodFilter] = useState<MethodFilter>('ALL');
  const [groupByModule, setGroupByModule] = useState(false);

  const { data, isLoading, isError, error } = useRouteManifest();

  const modules = useMemo(() => {
    if (data === undefined) return [];
    return Array.from(new Set(data.routes.map((route) => route.module))).sort();
  }, [data]);

  const filteredRoutes = useMemo(() => {
    if (data === undefined) return [];
    return data.routes.filter((route) => {
      if (moduleFilter !== 'ALL' && route.module !== moduleFilter) return false;
      if (methodFilter !== 'ALL' && route.method !== methodFilter) return false;
      if (search !== '' && !route.path.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [data, methodFilter, moduleFilter, search]);

  const groupedRoutes = useMemo(() => {
    if (!groupByModule) return null;

    const groups: Record<string, RouteEntry[]> = {};
    for (const route of filteredRoutes) {
      const key = route.module;
      groups[key] ??= [];
      groups[key].push(route);
    }
    return groups;
  }, [filteredRoutes, groupByModule]);

  if (isLoading) {
    return (
      <PageContainer>
        <div className="flex flex-col gap-3 py-4">
          <Skeleton width="8rem" height="1.75rem" />
          <Skeleton width="100%" height="2.5rem" radius="var(--ui-radius-md)" />
          <Skeleton width="100%" height="2rem" />
          <Skeleton width="100%" height="2rem" />
          <Skeleton width="100%" height="2rem" />
          <Skeleton width="100%" height="2rem" />
          <Skeleton width="100%" height="2rem" />
        </div>
      </PageContainer>
    );
  }

  if (isError) {
    return (
      <PageContainer>
        <Text className="text-text-error">
          Failed to load route manifest: {error?.message ?? 'Unknown error'}
        </Text>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <Heading as="h2" size="lg">
              API Routes
            </Heading>
            <Text className="text-text-muted">{data?.count ?? 0} registered routes</Text>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Input
            placeholder="Search by path..."
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
            }}
            className="w-64"
          />

          <Select
            value={moduleFilter}
            onChange={(value) => {
              setModuleFilter(value);
            }}
          >
            <option value="ALL">All Modules</option>
            {modules.map((moduleName) => (
              <option key={moduleName} value={moduleName}>
                {moduleName}
              </option>
            ))}
          </Select>

          <Select
            value={methodFilter}
            onChange={(value) => {
              setMethodFilter(isMethodFilter(value) ? value : 'ALL');
            }}
          >
            {ALL_METHODS.map((method) => (
              <option key={method} value={method}>
                {method === 'ALL' ? 'All Methods' : method}
              </option>
            ))}
          </Select>

          <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
            <Checkbox
              checked={groupByModule}
              onChange={(checked) => {
                setGroupByModule(checked);
              }}
            />
            Group by module
          </label>
        </div>

        <Text className="text-sm text-text-muted">
          Showing {filteredRoutes.length} of {data?.count ?? 0} routes
        </Text>

        {groupByModule && groupedRoutes !== null ? (
          Object.entries(groupedRoutes)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([moduleName, routes]) => (
              <div key={moduleName} className="flex flex-col gap-2">
                <Heading as="h4" size="sm" className="capitalize">
                  {moduleName}
                </Heading>
                <RouteTable routes={routes} />
              </div>
            ))
        ) : (
          <RouteTable routes={filteredRoutes} />
        )}
      </div>
    </PageContainer>
  );
};

function RouteTable({ routes }: { routes: RouteEntry[] }): JSX.Element {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Method</TableHead>
          <TableHead>Path</TableHead>
          <TableHead>Module</TableHead>
          <TableHead>Auth</TableHead>
          <TableHead>Schema</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {routes.map((route, index) => (
          <TableRow key={`${route.method}-${route.path}-${String(index)}`}>
            <TableCell>
              <MethodBadge method={route.method} />
            </TableCell>
            <TableCell>
              <code className="text-sm">{route.path}</code>
            </TableCell>
            <TableCell>
              <Badge className="capitalize">{route.module}</Badge>
            </TableCell>
            <TableCell>
              <AuthBadge isPublic={route.isPublic} roles={route.roles} />
            </TableCell>
            <TableCell>
              {route.hasSchema ? (
                <Badge>Yes</Badge>
              ) : (
                <Text as="span" className="text-text-muted text-sm">
                  -
                </Text>
              )}
            </TableCell>
          </TableRow>
        ))}

        {routes.length === 0 ? (
          <TableRow>
            <TableCell colSpan={5}>
              <Text className="text-center text-text-muted py-4">
                No routes match the current filters
              </Text>
            </TableCell>
          </TableRow>
        ) : null}
      </TableBody>
    </Table>
  );
}
