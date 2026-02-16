// main/apps/web/src/features/workspace/hooks/usePermissions.test.ts
import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { usePermissions } from './usePermissions';

describe('usePermissions', () => {
  describe('can()', () => {
    it('allows platform admin to do anything', () => {
      const { result } = renderHook(() => usePermissions({ appRole: 'admin' }));

      expect(result.current.can('manage', 'billing')).toBe(true);
      expect(result.current.can('write', 'tenant')).toBe(true);
      expect(result.current.can('delete', 'data')).toBe(true);
    });

    it('allows workspace owner to write tenant', () => {
      const { result } = renderHook(() => usePermissions({ appRole: 'user', tenantRole: 'owner' }));

      expect(result.current.can('write', 'tenant')).toBe(true);
      expect(result.current.can('manage', 'tenant')).toBe(true);
    });

    it('allows workspace admin to invite members', () => {
      const { result } = renderHook(() => usePermissions({ appRole: 'user', tenantRole: 'admin' }));

      expect(result.current.can('invite', 'membership')).toBe(true);
      expect(result.current.can('manage', 'membership')).toBe(true);
    });

    it('denies member from writing tenant', () => {
      const { result } = renderHook(() =>
        usePermissions({ appRole: 'user', tenantRole: 'member' }),
      );

      expect(result.current.can('write', 'tenant')).toBe(false);
      expect(result.current.can('read', 'tenant')).toBe(true);
    });

    it('denies viewer from inviting members', () => {
      const { result } = renderHook(() =>
        usePermissions({ appRole: 'user', tenantRole: 'viewer' }),
      );

      expect(result.current.can('invite', 'membership')).toBe(false);
      expect(result.current.can('read', 'membership')).toBe(true);
    });

    it('denies everything when no tenant role', () => {
      const { result } = renderHook(() => usePermissions({ appRole: 'user' }));

      expect(result.current.can('read', 'tenant')).toBe(false);
      expect(result.current.can('read', 'data')).toBe(false);
    });

    it('allows data write when isOwner is true', () => {
      const { result } = renderHook(() =>
        usePermissions({ appRole: 'user', tenantRole: 'member', isOwner: true }),
      );

      expect(result.current.can('write', 'data')).toBe(true);
      expect(result.current.can('delete', 'data')).toBe(true);
    });

    it('denies data write when member is not owner', () => {
      const { result } = renderHook(() =>
        usePermissions({ appRole: 'user', tenantRole: 'member' }),
      );

      expect(result.current.can('write', 'data')).toBe(false);
    });
  });

  describe('hasPermission()', () => {
    it('checks permission strings', () => {
      const { result } = renderHook(() => usePermissions({ appRole: 'user', tenantRole: 'owner' }));

      expect(result.current.hasPermission('billing:manage')).toBe(true);
      expect(result.current.hasPermission('membership:invite')).toBe(true);
    });

    it('denies invalid permissions', () => {
      const { result } = renderHook(() =>
        usePermissions({ appRole: 'user', tenantRole: 'member' }),
      );

      expect(result.current.hasPermission('billing:manage')).toBe(false);
      expect(result.current.hasPermission('settings:manage')).toBe(false);
    });
  });

  describe('authContext', () => {
    it('exposes the computed auth context', () => {
      const { result } = renderHook(() =>
        usePermissions({ appRole: 'user', tenantRole: 'admin', isOwner: true }),
      );

      expect(result.current.authContext).toEqual({
        appRole: 'user',
        tenantRole: 'admin',
        isOwner: true,
      });
    });

    it('defaults appRole to user', () => {
      const { result } = renderHook(() => usePermissions());

      expect(result.current.authContext.appRole).toBe('user');
      expect(result.current.authContext.tenantRole).toBeNull();
    });
  });
});
