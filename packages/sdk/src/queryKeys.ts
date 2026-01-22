// packages/sdk/src/queryKeys.ts
/**
 * Centralized Query Key Factory
 *
 * Provides type-safe, hierarchical query keys for the custom query hooks.
 * Using a factory pattern ensures:
 * - Consistent key structure across the app
 * - Type safety for filter/parameter objects
 * - Easy cache invalidation at any level of the hierarchy
 *
 * @example
 * ```ts
 * // Use in queries
 * useQuery({
 *   queryKey: queryKeys.users.detail(userId),
 *   queryFn: () => fetchUser(userId),
 * });
 *
 * // Invalidate all user queries
 * queryCache.invalidateQueries({ queryKey: queryKeys.users.all });
 *
 * // Invalidate specific user
 * queryCache.invalidateQueries({ queryKey: queryKeys.users.detail(userId) });
 * ```
 */

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
 *
 * Structure follows the pattern:
 * - all: Base key for the domain (for broad invalidation)
 * - list: List queries with optional filters
 * - detail: Single entity queries by ID
 *
 * Keys are typed as const tuples for strict type checking.
 */
export const queryKeys = {
  /**
   * Authentication-related query keys
   */
  auth: {
    all: ['auth'] as const,
    user: () => [...queryKeys.auth.all, 'user'] as const,
    session: () => [...queryKeys.auth.all, 'session'] as const,
    permissions: () => [...queryKeys.auth.all, 'permissions'] as const,
  },

  /**
   * User-related query keys
   */
  users: {
    all: ['users'] as const,
    list: (filters?: UserListFilters) => [...queryKeys.users.all, 'list', filters] as const,
    detail: (id: string) => [...queryKeys.users.all, 'detail', id] as const,
    profile: (id: string) => [...queryKeys.users.all, 'profile', id] as const,
  },

  /**
   * Posts/content-related query keys
   */
  posts: {
    all: ['posts'] as const,
    list: (filters?: PostListFilters) => [...queryKeys.posts.all, 'list', filters] as const,
    detail: (id: string) => [...queryKeys.posts.all, 'detail', id] as const,
    comments: (postId: string) => [...queryKeys.posts.all, postId, 'comments'] as const,
  },

  /**
   * Notification-related query keys
   */
  notifications: {
    all: ['notifications'] as const,
    list: (filters?: { read?: boolean }) =>
      [...queryKeys.notifications.all, 'list', filters] as const,
    unreadCount: () => [...queryKeys.notifications.all, 'unread-count'] as const,
  },

  /**
   * Settings-related query keys
   */
  settings: {
    all: ['settings'] as const,
    user: () => [...queryKeys.settings.all, 'user'] as const,
    app: () => [...queryKeys.settings.all, 'app'] as const,
  },
} as const;

/**
 * Type helper to extract query key types
 */
export type QueryKeys = typeof queryKeys;
