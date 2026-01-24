// packages/sdk/src/queryKeys.ts
/**
 * Centralized Query Key Factory
 *
 * Provides type-safe, hierarchical query keys for the custom query hooks.
 */

// ============================================================================
// Types
// ============================================================================

export type ListQueryKey<T extends string> = readonly [
  T,
  string,
  ...(string | number | Record<string, unknown>)[],
];
export type DetailQueryKey<T extends string> = readonly [
  T,
  string,
  string,
  ...(string | number | Record<string, unknown>)[],
];
export type InfiniteQueryKey<T extends string> = readonly [
  T,
  string,
  ...(string | number | Record<string, unknown>)[],
];

export type QueryKeyFactory<T extends string> = (
  ...args: (string | number | Record<string, unknown>)[]
) => readonly [T, ...(string | number | Record<string, unknown>)[]];

export interface QueryKeysOptions {
  list?: { key: string };
  detail?: { key: string };
  infinite?: { key: string };
}

export interface QueryKeys<T extends string> {
  _def: readonly [T];
  all: readonly [T];
  list: ListQueryKey<T>;
  detail: QueryKeyFactory<T>;
  infinite: InfiniteQueryKey<T>;
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Creates a standard set of query keys for a resource.
 *
 * @param entity The name of the entity (e.g. 'users', 'posts')
 * @param options Custom key segments for list, detail, and infinite queries
 */
export function createQueryKeys<T extends string>(
  entity: T,
  options?: QueryKeysOptions,
): QueryKeys<T> {
  const listKey = options?.list?.key ?? 'list';
  const detailKey = options?.detail?.key ?? 'detail';
  const infiniteKey = options?.infinite?.key ?? 'infinite';

  return {
    _def: [entity] as const,
    all: [entity] as const,
    list: [entity, listKey] as const,
    detail: (...args: (string | number | Record<string, unknown>)[]) =>
      [entity, detailKey, ...args] as const,
    infinite: [entity, infiniteKey] as const,
  };
}

// ============================================================================
// Legacy Static Keys (Deprecated - migrate to createQueryKeys)
// ============================================================================

/**
 * Filter types for list queries
 */
export interface UserListFilters {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
  status?: 'active' | 'inactive' | 'pending';
}

export interface PostListFilters {
  page?: number;
  limit?: number;
  authorId?: string;
  status?: 'draft' | 'published' | 'archived';
  tag?: string;
}

/**
 * Query key factory for the entire application.
 * Kept for backward compatibility.
 */
export const queryKeys = {
  auth: {
    all: ['auth'] as const,
    user: () => [...queryKeys.auth.all, 'user'] as const,
    session: () => [...queryKeys.auth.all, 'session'] as const,
    permissions: () => [...queryKeys.auth.all, 'permissions'] as const,
  },
  users: {
    all: ['users'] as const,
    list: (filters?: UserListFilters) => [...queryKeys.users.all, 'list', filters] as const,
    detail: (id: string) => [...queryKeys.users.all, 'detail', id] as const,
    profile: (id: string) => [...queryKeys.users.all, 'profile', id] as const,
  },
  posts: {
    all: ['posts'] as const,
    list: (filters?: PostListFilters) => [...queryKeys.posts.all, 'list', filters] as const,
    detail: (id: string) => [...queryKeys.posts.all, 'detail', id] as const,
    comments: (postId: string) => [...queryKeys.posts.all, postId, 'comments'] as const,
  },
  notifications: {
    all: ['notifications'] as const,
    list: (filters?: { read?: boolean }) =>
      [...queryKeys.notifications.all, 'list', filters] as const,
    unreadCount: () => [...queryKeys.notifications.all, 'unread-count'] as const,
  },
  settings: {
    all: ['settings'] as const,
    user: () => [...queryKeys.settings.all, 'user'] as const,
    app: () => [...queryKeys.settings.all, 'app'] as const,
  },
} as const;
