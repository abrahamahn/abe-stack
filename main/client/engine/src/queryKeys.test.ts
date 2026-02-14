// main/client/engine/src/queryKeys.test.ts
import { beforeEach, describe, expect, test } from 'vitest';

import {
  createQueryKeys,
  type DetailQueryKey,
  type InfiniteQueryKey,
  type ListQueryKey,
  type QueryKeyFactory,
  type QueryKeys,
} from './queryKeys';

describe('Query Keys', () => {
  describe('createQueryKeys', () => {
    test('should create query keys factory with default configuration', () => {
      const keys = createQueryKeys('users');

      expect(keys).toBeDefined();
      expect(keys._def).toEqual(['users']);
      expect(keys.all).toEqual(['users']);
      expect(keys.list).toEqual(['users', 'list']);
      expect(keys.detail).toBeTypeOf('function');
      expect(keys.infinite).toEqual(['users', 'infinite']);
    });

    test('should create query keys with custom options', () => {
      const options = {
        list: { key: 'search' },
        detail: { key: 'profile' },
        infinite: { key: 'feed' },
      };
      const keys = createQueryKeys('posts', options);

      expect(keys._def).toEqual(['posts']);
      expect(keys.all).toEqual(['posts']);
      expect(keys.list).toEqual(['posts', 'search']);
      expect(keys.infinite).toEqual(['posts', 'feed']);
    });

    test('should handle empty entity name', () => {
      const keys = createQueryKeys('');

      expect(keys._def).toEqual(['']);
      expect(keys.all).toEqual(['']);
      expect(keys.list).toEqual(['', 'list']);
    });

    test('should handle entity name with special characters', () => {
      const keys = createQueryKeys('user-profiles');

      expect(keys._def).toEqual(['user-profiles']);
      expect(keys.all).toEqual(['user-profiles']);
      expect(keys.list).toEqual(['user-profiles', 'list']);
    });

    test('should handle entity name with numbers', () => {
      const keys = createQueryKeys('api-v2');

      expect(keys._def).toEqual(['api-v2']);
      expect(keys.all).toEqual(['api-v2']);
      expect(keys.list).toEqual(['api-v2', 'list']);
    });
  });

  describe('QueryKeys structure', () => {
    let keys: QueryKeys<'users'>;

    beforeEach(() => {
      keys = createQueryKeys('users');
    });

    test('should have correct _def property', () => {
      expect(keys._def).toEqual(['users']);
    });

    test('should have correct all property', () => {
      expect(keys.all).toEqual(['users']);
    });

    test('should have correct list property', () => {
      expect(keys.list).toEqual(['users', 'list']);
    });

    test('should have detail function that returns correct key', () => {
      const detailKey = keys.detail('user-123');

      expect(detailKey).toEqual(['users', 'detail', 'user-123']);
    });

    test('should have infinite property', () => {
      expect(keys.infinite).toEqual(['users', 'infinite']);
    });

    test('should handle detail with multiple parameters', () => {
      const complexKeys = createQueryKeys('orders');
      const detailKey = (
        complexKeys.detail as unknown as (id: string, itemId: string) => DetailQueryKey<string>
      )('order-123', 'item-456');

      expect(detailKey).toEqual(['orders', 'detail', 'order-123', 'item-456']);
    });
  });

  describe('ListQueryKey', () => {
    test('should create list query key with default suffix', () => {
      const listKey: ListQueryKey<'users'> = ['users', 'list'];

      expect(listKey).toEqual(['users', 'list']);
      expect(listKey).toHaveLength(2);
    });

    test('should create list query key with custom suffix', () => {
      const listKey: ListQueryKey<'posts'> = ['posts', 'search'];

      expect(listKey).toEqual(['posts', 'search']);
    });

    test('should handle list with additional parameters', () => {
      const listKey: ListQueryKey<'users'> = ['users', 'list', { page: 1, limit: 10 }];

      expect(listKey).toEqual(['users', 'list', { page: 1, limit: 10 }]);
    });
  });

  describe('DetailQueryKey', () => {
    test('should create detail query key with id', () => {
      const detailKey: DetailQueryKey<'users'> = ['users', 'detail', 'user-123'];

      expect(detailKey).toEqual(['users', 'detail', 'user-123']);
      expect(detailKey).toHaveLength(3);
    });

    test('should handle detail with multiple ids', () => {
      const detailKey: DetailQueryKey<'orders'> = ['orders', 'detail', 'order-123', 'item-456'];

      expect(detailKey).toEqual(['orders', 'detail', 'order-123', 'item-456']);
      expect(detailKey).toHaveLength(4);
    });

    test('should handle detail with parameters', () => {
      const detailKey: DetailQueryKey<'users'> = [
        'users',
        'detail',
        'user-123',
        { include: 'profile' },
      ];

      expect(detailKey).toEqual(['users', 'detail', 'user-123', { include: 'profile' }]);
    });
  });

  describe('InfiniteQueryKey', () => {
    test('should create infinite query key with default suffix', () => {
      const infiniteKey: InfiniteQueryKey<'posts'> = ['posts', 'infinite'];

      expect(infiniteKey).toEqual(['posts', 'infinite']);
      expect(infiniteKey).toHaveLength(2);
    });

    test('should create infinite query key with custom suffix', () => {
      const infiniteKey: InfiniteQueryKey<'posts'> = ['posts', 'feed'];

      expect(infiniteKey).toEqual(['posts', 'feed']);
    });

    test('should handle infinite with parameters', () => {
      const infiniteKey: InfiniteQueryKey<'posts'> = ['posts', 'infinite', { sortBy: 'date' }];

      expect(infiniteKey).toEqual(['posts', 'infinite', { sortBy: 'date' }]);
    });
  });

  describe('QueryKeyFactory', () => {
    test('should create a factory function', () => {
      const factory: QueryKeyFactory<'comments'> = (id) => ['comments', 'detail', id];

      const key = factory('comment-123');

      expect(key).toEqual(['comments', 'detail', 'comment-123']);
    });

    test('should handle factory with multiple parameters', () => {
      const factory: QueryKeyFactory<'posts'> = (postId, commentId) => [
        'posts',
        'detail',
        postId,
        'comments',
        'detail',
        commentId,
      ];

      const key = factory('post-123', 'comment-456');

      expect(key).toEqual(['posts', 'detail', 'post-123', 'comments', 'detail', 'comment-456']);
    });

    test('should handle factory with options', () => {
      const factory: QueryKeyFactory<'users'> = (id, options) =>
        options !== undefined ? ['users', 'detail', id, options] : ['users', 'detail', id];

      const keyWithOptions = factory('user-123', { include: 'profile' });
      const keyWithoutOptions = factory('user-456', undefined as unknown as string);

      expect(keyWithOptions).toEqual(['users', 'detail', 'user-123', { include: 'profile' }]);
      expect(keyWithoutOptions).toEqual(['users', 'detail', 'user-456']);
    });
  });

  describe('nested entities', () => {
    test('should handle nested entity relationships', () => {
      // Example of how to use with relationships
      const userPostsKey = ['users', 'detail', 'user-123', 'posts', 'list'];
      const postCommentsKey = ['posts', 'detail', 'post-456', 'comments', 'list'];

      expect(userPostsKey).toEqual(['users', 'detail', 'user-123', 'posts', 'list']);
      expect(postCommentsKey).toEqual(['posts', 'detail', 'post-456', 'comments', 'list']);
    });

    test('should work with complex hierarchies', () => {
      // Simulating org -> teams -> members hierarchy
      const orgTeamsKey = ['organizations', 'detail', 'org-123', 'teams', 'list'];
      const teamMembersKey = [
        'organizations',
        'detail',
        'org-123',
        'teams',
        'detail',
        'team-456',
        'members',
        'list',
      ];

      expect(orgTeamsKey).toEqual(['organizations', 'detail', 'org-123', 'teams', 'list']);
      expect(teamMembersKey).toEqual([
        'organizations',
        'detail',
        'org-123',
        'teams',
        'detail',
        'team-456',
        'members',
        'list',
      ]);
    });
  });

  describe('custom options', () => {
    test('should use custom list key', () => {
      const keys = createQueryKeys('products', { list: { key: 'browse' } });

      expect(keys.list).toEqual(['products', 'browse']);
    });

    test('should use custom detail key', () => {
      const keys = createQueryKeys('categories', { detail: { key: 'view' } });

      const detailKey = keys.detail('category-123');
      expect(detailKey).toEqual(['categories', 'view', 'category-123']);
    });

    test('should use custom infinite key', () => {
      const keys = createQueryKeys('articles', { infinite: { key: 'timeline' } });

      expect(keys.infinite).toEqual(['articles', 'timeline']);
    });

    test('should use all custom keys', () => {
      const options = {
        list: { key: 'search' },
        detail: { key: 'preview' },
        infinite: { key: 'stream' },
      };
      const keys = createQueryKeys('documents', options);

      expect(keys.list).toEqual(['documents', 'search']);
      expect(keys.detail('doc-123')).toEqual(['documents', 'preview', 'doc-123']);
      expect(keys.infinite).toEqual(['documents', 'stream']);
    });

    test('should handle empty custom options', () => {
      const keys = createQueryKeys('items', {});

      expect(keys.list).toEqual(['items', 'list']);
      expect(keys.detail('item-123')).toEqual(['items', 'detail', 'item-123']);
      expect(keys.infinite).toEqual(['items', 'infinite']);
    });
  });

  describe('type safety', () => {
    test('should enforce correct typing for detail function', () => {
      const keys = createQueryKeys('users');

      // This should work
      const validKey = keys.detail('user-123');
      expect(validKey).toEqual(['users', 'detail', 'user-123']);

      // The typing ensures the function expects at least one parameter
    });

    test('should work with different entity types', () => {
      const userKeys = createQueryKeys('users');
      const postKeys = createQueryKeys('posts');
      const tagKeys = createQueryKeys('tags');

      expect(userKeys._def).toEqual(['users']);
      expect(postKeys._def).toEqual(['posts']);
      expect(tagKeys._def).toEqual(['tags']);

      expect(userKeys.list).toEqual(['users', 'list']);
      expect(postKeys.list).toEqual(['posts', 'list']);
      expect(tagKeys.list).toEqual(['tags', 'list']);
    });
  });

  describe('practical usage patterns', () => {
    test('should support pagination patterns', () => {
      const keys = createQueryKeys('products');

      // Regular list
      const allProducts = keys.list;

      // Paginated (simulated with parameters)
      const page1 = [...keys.list, { page: 1, limit: 20 }];
      const page2 = [...keys.list, { page: 2, limit: 20 }];

      expect(allProducts).toEqual(['products', 'list']);
      expect(page1).toEqual(['products', 'list', { page: 1, limit: 20 }]);
      expect(page2).toEqual(['products', 'list', { page: 2, limit: 20 }]);
    });

    test('should support filtering patterns', () => {
      const keys = createQueryKeys('tasks');

      const allTasks = keys.list;
      const completedTasks = [...keys.list, { status: 'completed' }];
      const assignedTasks = [...keys.list, { assignee: 'user-123' }];

      expect(allTasks).toEqual(['tasks', 'list']);
      expect(completedTasks).toEqual(['tasks', 'list', { status: 'completed' }]);
      expect(assignedTasks).toEqual(['tasks', 'list', { assignee: 'user-123' }]);
    });

    test('should support search patterns', () => {
      const keys = createQueryKeys('documents');

      const searchResults = [...keys.list, { q: 'query term', tags: ['important', 'review'] }];

      expect(searchResults).toEqual([
        'documents',
        'list',
        { q: 'query term', tags: ['important', 'review'] },
      ]);
    });
  });

  describe('edge cases', () => {
    test('should handle very long entity names', () => {
      const longEntity = 'very-long-entity-name-with-many-hyphens-and-descriptive-text';
      const keys = createQueryKeys(longEntity);

      expect(keys._def).toEqual([longEntity]);
      expect(keys.list).toEqual([longEntity, 'list']);
      expect(keys.detail('id')).toEqual([longEntity, 'detail', 'id']);
    });

    test('should handle entity names with special characters', () => {
      const specialEntity = 'entity@#$%^&*()';
      const keys = createQueryKeys(specialEntity);

      expect(keys._def).toEqual([specialEntity]);
      expect(keys.list).toEqual([specialEntity, 'list']);
    });

    test('should handle undefined and null in parameters', () => {
      const keys = createQueryKeys('items');

      const keyWithNull = (keys.detail as unknown as (id: string) => string[])(
        null as unknown as string,
      );
      const keyWithUndefined = (keys.detail as unknown as (id: string) => string[])(
        undefined as unknown as string,
      );

      expect(keyWithNull).toEqual(['items', 'detail', null]);
      expect(keyWithUndefined).toEqual(['items', 'detail', undefined]);
    });
  });
});
