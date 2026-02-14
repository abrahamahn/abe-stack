// main/shared/src/domain/tenant/tenant.logic.test.ts

/**
 * @file Unit Tests for Tenant Logic
 * @description Tests for tenant domain logic including workspace context, guards, and role checks.
 * @module Domain/Tenant
 */

import { describe, expect, it } from 'vitest';

import { ERROR_CODES } from '../../core/constants';

import {
  WORKSPACE_ID_HEADER,
  WORKSPACE_ROLE_HEADER,
  ScopeError,
  assertWorkspaceScope,
  createWorkspaceContext,
  isWorkspaceScoped,
  getWorkspaceContext,
  hasRequiredWorkspaceRole,
  isAdmin,
  isOwner,
  type WorkspaceContext,
  type MaybeWorkspaceContext,
} from './tenant.logic';

// ============================================================================
// Constants
// ============================================================================

describe('Constants', () => {
  it('should export WORKSPACE_ID_HEADER with correct value', () => {
    expect(WORKSPACE_ID_HEADER).toBe('x-workspace-id');
  });

  it('should export WORKSPACE_ROLE_HEADER with correct value', () => {
    expect(WORKSPACE_ROLE_HEADER).toBe('x-workspace-role');
  });
});

// ============================================================================
// ScopeError
// ============================================================================

describe('ScopeError', () => {
  it('should create error with correct name', () => {
    const error = new ScopeError('Test message', ERROR_CODES.FORBIDDEN);
    expect(error.name).toBe('ScopeError');
  });

  it('should create error with correct message', () => {
    const error = new ScopeError('Test message', ERROR_CODES.FORBIDDEN);
    expect(error.message).toBe('Test message');
  });

  it('should create error with correct code', () => {
    const error = new ScopeError('Test message', ERROR_CODES.FORBIDDEN);
    expect(error.code).toBe(ERROR_CODES.FORBIDDEN);
  });

  it('should be instance of Error', () => {
    const error = new ScopeError('Test message', ERROR_CODES.FORBIDDEN);
    expect(error).toBeInstanceOf(Error);
  });

  it('should accept any error code', () => {
    const error = new ScopeError('Test message', ERROR_CODES.UNAUTHORIZED);
    expect(error.code).toBe(ERROR_CODES.UNAUTHORIZED);
  });
});

// ============================================================================
// assertWorkspaceScope
// ============================================================================

describe('assertWorkspaceScope', () => {
  describe('throws ScopeError for invalid workspace context', () => {
    it('should throw when context is undefined', () => {
      expect(() => {
        assertWorkspaceScope(undefined);
      }).toThrow(ScopeError);
      expect(() => {
        assertWorkspaceScope(undefined);
      }).toThrow('Workspace scope required for this operation');
    });

    it('should throw with FORBIDDEN code when context is undefined', () => {
      try {
        assertWorkspaceScope(undefined);
      } catch (error) {
        expect(error).toBeInstanceOf(ScopeError);
        expect((error as ScopeError).code).toBe(ERROR_CODES.FORBIDDEN);
      }
    });

    it('should throw when workspaceId is undefined', () => {
      const context: MaybeWorkspaceContext = { userId: 'user-1' };
      expect(() => {
        assertWorkspaceScope(context);
      }).toThrow(ScopeError);
      expect(() => {
        assertWorkspaceScope(context);
      }).toThrow('Workspace scope required for this operation');
    });

    it('should throw when workspaceId is empty string', () => {
      const context: MaybeWorkspaceContext = { workspaceId: '', userId: 'user-1' };
      expect(() => {
        assertWorkspaceScope(context);
      }).toThrow(ScopeError);
      expect(() => {
        assertWorkspaceScope(context);
      }).toThrow('Workspace scope required for this operation');
    });

    it('should throw custom message when provided', () => {
      expect(() => {
        assertWorkspaceScope(undefined, 'Custom workspace error message');
      }).toThrow('Custom workspace error message');
    });
  });

  describe('throws ScopeError for invalid user context', () => {
    it('should throw when userId is undefined', () => {
      const context: MaybeWorkspaceContext = { workspaceId: 'ws-1' };
      expect(() => {
        assertWorkspaceScope(context);
      }).toThrow(ScopeError);
      expect(() => {
        assertWorkspaceScope(context);
      }).toThrow('User context required for workspace operation');
    });

    it('should throw with UNAUTHORIZED code when userId is undefined', () => {
      const context: MaybeWorkspaceContext = { workspaceId: 'ws-1' };
      try {
        assertWorkspaceScope(context);
      } catch (error) {
        expect(error).toBeInstanceOf(ScopeError);
        expect((error as ScopeError).code).toBe(ERROR_CODES.UNAUTHORIZED);
      }
    });

    it('should throw when userId is empty string', () => {
      const context: MaybeWorkspaceContext = { workspaceId: 'ws-1', userId: '' };
      expect(() => {
        assertWorkspaceScope(context);
      }).toThrow(ScopeError);
      expect(() => {
        assertWorkspaceScope(context);
      }).toThrow('User context required for workspace operation');
    });
  });

  describe('passes for valid workspace context', () => {
    it('should not throw for valid context with workspaceId and userId', () => {
      const context: WorkspaceContext = { workspaceId: 'ws-1', userId: 'user-1' };
      expect(() => {
        assertWorkspaceScope(context);
      }).not.toThrow();
    });

    it('should not throw for valid context with role', () => {
      const context: WorkspaceContext = {
        workspaceId: 'ws-1',
        userId: 'user-1',
        role: 'admin',
      };
      expect(() => {
        assertWorkspaceScope(context);
      }).not.toThrow();
    });

    it('should narrow type after assertion', () => {
      const context: MaybeWorkspaceContext = { workspaceId: 'ws-1', userId: 'user-1' };
      assertWorkspaceScope(context);
      // TypeScript should now know context is WorkspaceContext
      const workspaceId: string = context.workspaceId;
      const userId: string = context.userId;
      expect(workspaceId).toBe('ws-1');
      expect(userId).toBe('user-1');
    });
  });
});

// ============================================================================
// createWorkspaceContext
// ============================================================================

describe('createWorkspaceContext', () => {
  describe('throws for invalid inputs', () => {
    it('should throw when workspaceId is undefined', () => {
      expect(() => {
        createWorkspaceContext(undefined, 'user-1');
      }).toThrow(ScopeError);
      expect(() => {
        createWorkspaceContext(undefined, 'user-1');
      }).toThrow('Workspace scope required for this operation');
    });

    it('should throw with FORBIDDEN code when workspaceId is undefined', () => {
      try {
        createWorkspaceContext(undefined, 'user-1');
      } catch (error) {
        expect(error).toBeInstanceOf(ScopeError);
        expect((error as ScopeError).code).toBe(ERROR_CODES.FORBIDDEN);
      }
    });

    it('should throw when workspaceId is empty string', () => {
      expect(() => {
        createWorkspaceContext('', 'user-1');
      }).toThrow(ScopeError);
      expect(() => {
        createWorkspaceContext('', 'user-1');
      }).toThrow('Workspace scope required for this operation');
    });

    it('should throw when userId is undefined', () => {
      expect(() => {
        createWorkspaceContext('ws-1', undefined);
      }).toThrow(ScopeError);
      expect(() => {
        createWorkspaceContext('ws-1', undefined);
      }).toThrow('User context required for workspace operation');
    });

    it('should throw with UNAUTHORIZED code when userId is undefined', () => {
      try {
        createWorkspaceContext('ws-1', undefined);
      } catch (error) {
        expect(error).toBeInstanceOf(ScopeError);
        expect((error as ScopeError).code).toBe(ERROR_CODES.UNAUTHORIZED);
      }
    });

    it('should throw when userId is empty string', () => {
      expect(() => {
        createWorkspaceContext('ws-1', '');
      }).toThrow(ScopeError);
      expect(() => {
        createWorkspaceContext('ws-1', '');
      }).toThrow('User context required for workspace operation');
    });

    it('should throw when both workspaceId and userId are undefined', () => {
      expect(() => {
        createWorkspaceContext(undefined, undefined);
      }).toThrow(ScopeError);
    });
  });

  describe('creates context successfully', () => {
    it('should create context with workspaceId and userId', () => {
      const context = createWorkspaceContext('ws-1', 'user-1');
      expect(context.workspaceId).toBe('ws-1');
      expect(context.userId).toBe('user-1');
      expect(context.role).toBeUndefined();
    });

    it('should create context with role when provided', () => {
      const context = createWorkspaceContext('ws-1', 'user-1', 'admin');
      expect(context.workspaceId).toBe('ws-1');
      expect(context.userId).toBe('user-1');
      expect(context.role).toBe('admin');
    });

    it('should create context with owner role', () => {
      const context = createWorkspaceContext('ws-1', 'user-1', 'owner');
      expect(context.role).toBe('owner');
    });

    it('should create context with member role', () => {
      const context = createWorkspaceContext('ws-1', 'user-1', 'member');
      expect(context.role).toBe('member');
    });

    it('should create context with viewer role', () => {
      const context = createWorkspaceContext('ws-1', 'user-1', 'viewer');
      expect(context.role).toBe('viewer');
    });

    it('should not include role property when undefined', () => {
      const context = createWorkspaceContext('ws-1', 'user-1', undefined);
      expect(context.workspaceId).toBe('ws-1');
      expect(context.userId).toBe('user-1');
      expect('role' in context).toBe(false);
    });
  });
});

// ============================================================================
// isWorkspaceScoped
// ============================================================================

describe('isWorkspaceScoped', () => {
  describe('returns false for invalid contexts', () => {
    it('should return false when context is undefined', () => {
      expect(isWorkspaceScoped(undefined)).toBe(false);
    });

    it('should return false when workspaceId is undefined', () => {
      const context: MaybeWorkspaceContext = { userId: 'user-1' };
      expect(isWorkspaceScoped(context)).toBe(false);
    });

    it('should return false when workspaceId is empty string', () => {
      const context: MaybeWorkspaceContext = { workspaceId: '', userId: 'user-1' };
      expect(isWorkspaceScoped(context)).toBe(false);
    });

    it('should return false when userId is undefined', () => {
      const context: MaybeWorkspaceContext = { workspaceId: 'ws-1' };
      expect(isWorkspaceScoped(context)).toBe(false);
    });

    it('should return false when both workspaceId and userId are undefined', () => {
      const context: MaybeWorkspaceContext = {};
      expect(isWorkspaceScoped(context)).toBe(false);
    });

    it('should return false for empty object', () => {
      expect(isWorkspaceScoped({})).toBe(false);
    });
  });

  describe('returns true for valid contexts', () => {
    it('should return true for context with workspaceId and userId', () => {
      const context: WorkspaceContext = { workspaceId: 'ws-1', userId: 'user-1' };
      expect(isWorkspaceScoped(context)).toBe(true);
    });

    it('should return true for context with role', () => {
      const context: WorkspaceContext = {
        workspaceId: 'ws-1',
        userId: 'user-1',
        role: 'admin',
      };
      expect(isWorkspaceScoped(context)).toBe(true);
    });

    it('should narrow type when returning true', () => {
      const context: MaybeWorkspaceContext = { workspaceId: 'ws-1', userId: 'user-1' };
      if (isWorkspaceScoped(context)) {
        // TypeScript should now know context is WorkspaceContext
        const workspaceId: string = context.workspaceId;
        const userId: string = context.userId;
        expect(workspaceId).toBe('ws-1');
        expect(userId).toBe('user-1');
      }
    });
  });
});

// ============================================================================
// getWorkspaceContext
// ============================================================================

describe('getWorkspaceContext', () => {
  describe('returns undefined for invalid inputs', () => {
    it('should return undefined when user is undefined', () => {
      const headers = { [WORKSPACE_ID_HEADER]: 'ws-1' };
      expect(getWorkspaceContext(undefined, headers)).toBeUndefined();
    });

    it('should return undefined when workspace header is missing', () => {
      const user = { userId: 'user-1' };
      const headers = {};
      expect(getWorkspaceContext(user, headers)).toBeUndefined();
    });

    it('should return undefined when workspace header is empty string', () => {
      const user = { userId: 'user-1' };
      const headers = { [WORKSPACE_ID_HEADER]: '' };
      expect(getWorkspaceContext(user, headers)).toBeUndefined();
    });

    it('should return undefined when workspace header is array', () => {
      const user = { userId: 'user-1' };
      const headers = { [WORKSPACE_ID_HEADER]: ['ws-1', 'ws-2'] };
      expect(getWorkspaceContext(user, headers)).toBeUndefined();
    });

    it('should return undefined when workspace header is undefined in headers', () => {
      const user = { userId: 'user-1' };
      const headers = { [WORKSPACE_ID_HEADER]: undefined };
      expect(getWorkspaceContext(user, headers)).toBeUndefined();
    });
  });

  describe('creates context successfully', () => {
    it('should create context with workspaceId and userId from headers', () => {
      const user = { userId: 'user-1' };
      const headers = { [WORKSPACE_ID_HEADER]: 'ws-1' };
      const context = getWorkspaceContext(user, headers);
      expect(context).toBeDefined();
      expect(context?.workspaceId).toBe('ws-1');
      expect(context?.userId).toBe('user-1');
    });

    it('should default role to member when role header is missing', () => {
      const user = { userId: 'user-1' };
      const headers = { [WORKSPACE_ID_HEADER]: 'ws-1' };
      const context = getWorkspaceContext(user, headers);
      expect(context?.role).toBe('member');
    });

    it('should use role from header when provided', () => {
      const user = { userId: 'user-1' };
      const headers = {
        [WORKSPACE_ID_HEADER]: 'ws-1',
        [WORKSPACE_ROLE_HEADER]: 'admin',
      };
      const context = getWorkspaceContext(user, headers);
      expect(context?.role).toBe('admin');
    });

    it('should handle owner role', () => {
      const user = { userId: 'user-1' };
      const headers = {
        [WORKSPACE_ID_HEADER]: 'ws-1',
        [WORKSPACE_ROLE_HEADER]: 'owner',
      };
      const context = getWorkspaceContext(user, headers);
      expect(context?.role).toBe('owner');
    });

    it('should handle viewer role', () => {
      const user = { userId: 'user-1' };
      const headers = {
        [WORKSPACE_ID_HEADER]: 'ws-1',
        [WORKSPACE_ROLE_HEADER]: 'viewer',
      };
      const context = getWorkspaceContext(user, headers);
      expect(context?.role).toBe('viewer');
    });

    it('should handle member role explicitly', () => {
      const user = { userId: 'user-1' };
      const headers = {
        [WORKSPACE_ID_HEADER]: 'ws-1',
        [WORKSPACE_ROLE_HEADER]: 'member',
      };
      const context = getWorkspaceContext(user, headers);
      expect(context?.role).toBe('member');
    });
  });
});

// ============================================================================
// hasRequiredWorkspaceRole
// ============================================================================

describe('hasRequiredWorkspaceRole', () => {
  describe('owner role checks', () => {
    it('should return true when owner checks for owner', () => {
      const context: WorkspaceContext = {
        workspaceId: 'ws-1',
        userId: 'user-1',
        role: 'owner',
      };
      expect(hasRequiredWorkspaceRole(context, 'owner')).toBe(true);
    });

    it('should return true when owner checks for admin', () => {
      const context: WorkspaceContext = {
        workspaceId: 'ws-1',
        userId: 'user-1',
        role: 'owner',
      };
      expect(hasRequiredWorkspaceRole(context, 'admin')).toBe(true);
    });

    it('should return true when owner checks for member', () => {
      const context: WorkspaceContext = {
        workspaceId: 'ws-1',
        userId: 'user-1',
        role: 'owner',
      };
      expect(hasRequiredWorkspaceRole(context, 'member')).toBe(true);
    });

    it('should return true when owner checks for viewer', () => {
      const context: WorkspaceContext = {
        workspaceId: 'ws-1',
        userId: 'user-1',
        role: 'owner',
      };
      expect(hasRequiredWorkspaceRole(context, 'viewer')).toBe(true);
    });
  });

  describe('admin role checks', () => {
    it('should return false when admin checks for owner', () => {
      const context: WorkspaceContext = {
        workspaceId: 'ws-1',
        userId: 'user-1',
        role: 'admin',
      };
      expect(hasRequiredWorkspaceRole(context, 'owner')).toBe(false);
    });

    it('should return true when admin checks for admin', () => {
      const context: WorkspaceContext = {
        workspaceId: 'ws-1',
        userId: 'user-1',
        role: 'admin',
      };
      expect(hasRequiredWorkspaceRole(context, 'admin')).toBe(true);
    });

    it('should return true when admin checks for member', () => {
      const context: WorkspaceContext = {
        workspaceId: 'ws-1',
        userId: 'user-1',
        role: 'admin',
      };
      expect(hasRequiredWorkspaceRole(context, 'member')).toBe(true);
    });

    it('should return true when admin checks for viewer', () => {
      const context: WorkspaceContext = {
        workspaceId: 'ws-1',
        userId: 'user-1',
        role: 'admin',
      };
      expect(hasRequiredWorkspaceRole(context, 'viewer')).toBe(true);
    });
  });

  describe('member role checks', () => {
    it('should return false when member checks for owner', () => {
      const context: WorkspaceContext = {
        workspaceId: 'ws-1',
        userId: 'user-1',
        role: 'member',
      };
      expect(hasRequiredWorkspaceRole(context, 'owner')).toBe(false);
    });

    it('should return false when member checks for admin', () => {
      const context: WorkspaceContext = {
        workspaceId: 'ws-1',
        userId: 'user-1',
        role: 'member',
      };
      expect(hasRequiredWorkspaceRole(context, 'admin')).toBe(false);
    });

    it('should return true when member checks for member', () => {
      const context: WorkspaceContext = {
        workspaceId: 'ws-1',
        userId: 'user-1',
        role: 'member',
      };
      expect(hasRequiredWorkspaceRole(context, 'member')).toBe(true);
    });

    it('should return true when member checks for viewer', () => {
      const context: WorkspaceContext = {
        workspaceId: 'ws-1',
        userId: 'user-1',
        role: 'member',
      };
      expect(hasRequiredWorkspaceRole(context, 'viewer')).toBe(true);
    });
  });

  describe('viewer role checks', () => {
    it('should return false when viewer checks for owner', () => {
      const context: WorkspaceContext = {
        workspaceId: 'ws-1',
        userId: 'user-1',
        role: 'viewer',
      };
      expect(hasRequiredWorkspaceRole(context, 'owner')).toBe(false);
    });

    it('should return false when viewer checks for admin', () => {
      const context: WorkspaceContext = {
        workspaceId: 'ws-1',
        userId: 'user-1',
        role: 'viewer',
      };
      expect(hasRequiredWorkspaceRole(context, 'admin')).toBe(false);
    });

    it('should return false when viewer checks for member', () => {
      const context: WorkspaceContext = {
        workspaceId: 'ws-1',
        userId: 'user-1',
        role: 'viewer',
      };
      expect(hasRequiredWorkspaceRole(context, 'member')).toBe(false);
    });

    it('should return true when viewer checks for viewer', () => {
      const context: WorkspaceContext = {
        workspaceId: 'ws-1',
        userId: 'user-1',
        role: 'viewer',
      };
      expect(hasRequiredWorkspaceRole(context, 'viewer')).toBe(true);
    });
  });

  describe('undefined role defaults to member', () => {
    it('should treat undefined role as member for owner check', () => {
      const context: WorkspaceContext = {
        workspaceId: 'ws-1',
        userId: 'user-1',
      };
      expect(hasRequiredWorkspaceRole(context, 'owner')).toBe(false);
    });

    it('should treat undefined role as member for admin check', () => {
      const context: WorkspaceContext = {
        workspaceId: 'ws-1',
        userId: 'user-1',
      };
      expect(hasRequiredWorkspaceRole(context, 'admin')).toBe(false);
    });

    it('should treat undefined role as member for member check', () => {
      const context: WorkspaceContext = {
        workspaceId: 'ws-1',
        userId: 'user-1',
      };
      expect(hasRequiredWorkspaceRole(context, 'member')).toBe(true);
    });

    it('should treat undefined role as member for viewer check', () => {
      const context: WorkspaceContext = {
        workspaceId: 'ws-1',
        userId: 'user-1',
      };
      expect(hasRequiredWorkspaceRole(context, 'viewer')).toBe(true);
    });
  });
});

// ============================================================================
// isAdmin
// ============================================================================

describe('isAdmin', () => {
  it('should return true for owner', () => {
    const context: WorkspaceContext = {
      workspaceId: 'ws-1',
      userId: 'user-1',
      role: 'owner',
    };
    expect(isAdmin(context)).toBe(true);
  });

  it('should return true for admin', () => {
    const context: WorkspaceContext = {
      workspaceId: 'ws-1',
      userId: 'user-1',
      role: 'admin',
    };
    expect(isAdmin(context)).toBe(true);
  });

  it('should return false for member', () => {
    const context: WorkspaceContext = {
      workspaceId: 'ws-1',
      userId: 'user-1',
      role: 'member',
    };
    expect(isAdmin(context)).toBe(false);
  });

  it('should return false for viewer', () => {
    const context: WorkspaceContext = {
      workspaceId: 'ws-1',
      userId: 'user-1',
      role: 'viewer',
    };
    expect(isAdmin(context)).toBe(false);
  });

  it('should return false for undefined role (defaults to member)', () => {
    const context: WorkspaceContext = {
      workspaceId: 'ws-1',
      userId: 'user-1',
    };
    expect(isAdmin(context)).toBe(false);
  });
});

// ============================================================================
// isOwner
// ============================================================================

describe('isOwner', () => {
  it('should return true for owner', () => {
    const context: WorkspaceContext = {
      workspaceId: 'ws-1',
      userId: 'user-1',
      role: 'owner',
    };
    expect(isOwner(context)).toBe(true);
  });

  it('should return false for admin', () => {
    const context: WorkspaceContext = {
      workspaceId: 'ws-1',
      userId: 'user-1',
      role: 'admin',
    };
    expect(isOwner(context)).toBe(false);
  });

  it('should return false for member', () => {
    const context: WorkspaceContext = {
      workspaceId: 'ws-1',
      userId: 'user-1',
      role: 'member',
    };
    expect(isOwner(context)).toBe(false);
  });

  it('should return false for viewer', () => {
    const context: WorkspaceContext = {
      workspaceId: 'ws-1',
      userId: 'user-1',
      role: 'viewer',
    };
    expect(isOwner(context)).toBe(false);
  });

  it('should return false for undefined role (defaults to member)', () => {
    const context: WorkspaceContext = {
      workspaceId: 'ws-1',
      userId: 'user-1',
    };
    expect(isOwner(context)).toBe(false);
  });
});
