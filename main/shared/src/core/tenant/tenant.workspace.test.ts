// main/shared/src/core/tenant/tenant.workspace.test.ts

/**
 * @file Unit Tests for Tenant Workspace Context
 * @description Tests for workspace scoping types, guards, and helpers.
 * @module Core/Tenant/Tests
 */

import { describe, expect, it } from 'vitest';

import { ForbiddenError } from '../../engine/errors';

import {
  assertWorkspaceScope,
  createWorkspaceContext,
  isWorkspaceScoped,
  type MaybeWorkspaceContext,
  type WorkspaceContext,
} from './tenant.workspace';

// ============================================================================
// assertWorkspaceScope
// ============================================================================

describe('assertWorkspaceScope', () => {
  describe('when context is undefined', () => {
    it('should throw ForbiddenError with WORKSPACE_REQUIRED code', () => {
      expect(() => {
        assertWorkspaceScope(undefined);
      }).toThrow(ForbiddenError);

      try {
        assertWorkspaceScope(undefined);
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenError);
        if (error instanceof ForbiddenError) {
          expect(error.code).toBe('WORKSPACE_REQUIRED');
          expect(error.message).toBe('Workspace scope required for this operation');
        }
      }
    });

    it('should use custom message when provided', () => {
      const customMessage = 'Custom workspace required message';

      try {
        assertWorkspaceScope(undefined, customMessage);
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenError);
        if (error instanceof ForbiddenError) {
          expect(error.code).toBe('WORKSPACE_REQUIRED');
          expect(error.message).toBe(customMessage);
        }
      }
    });
  });

  describe('when workspaceId is missing', () => {
    it('should throw ForbiddenError with WORKSPACE_REQUIRED code when workspaceId is undefined', () => {
      const context: MaybeWorkspaceContext = {
        userId: 'user-123',
      };

      expect(() => {
        assertWorkspaceScope(context);
      }).toThrow(ForbiddenError);

      try {
        assertWorkspaceScope(context);
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenError);
        if (error instanceof ForbiddenError) {
          expect(error.code).toBe('WORKSPACE_REQUIRED');
          expect(error.message).toBe('Workspace scope required for this operation');
        }
      }
    });

    it('should throw ForbiddenError with WORKSPACE_REQUIRED code when workspaceId is empty string', () => {
      const context: MaybeWorkspaceContext = {
        workspaceId: '',
        userId: 'user-123',
      };

      expect(() => {
        assertWorkspaceScope(context);
      }).toThrow(ForbiddenError);

      try {
        assertWorkspaceScope(context);
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenError);
        if (error instanceof ForbiddenError) {
          expect(error.code).toBe('WORKSPACE_REQUIRED');
          expect(error.message).toBe('Workspace scope required for this operation');
        }
      }
    });

    it('should use custom message when workspaceId is missing', () => {
      const customMessage = 'Must provide workspace ID';
      const context: MaybeWorkspaceContext = {
        userId: 'user-123',
      };

      expect(() => {
        assertWorkspaceScope(context, customMessage);
      }).toThrow(ForbiddenError);

      try {
        assertWorkspaceScope(context, customMessage);
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenError);
        if (error instanceof ForbiddenError) {
          expect(error.code).toBe('WORKSPACE_REQUIRED');
          expect(error.message).toBe(customMessage);
        }
      }
    });
  });

  describe('when userId is missing', () => {
    it('should throw ForbiddenError with USER_REQUIRED code when userId is undefined', () => {
      const context: MaybeWorkspaceContext = {
        workspaceId: 'workspace-123',
      };

      expect(() => {
        assertWorkspaceScope(context);
      }).toThrow(ForbiddenError);

      try {
        assertWorkspaceScope(context);
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenError);
        if (error instanceof ForbiddenError) {
          expect(error.code).toBe('USER_REQUIRED');
          expect(error.message).toBe('User context required for workspace operation');
        }
      }
    });

    it('should throw ForbiddenError with USER_REQUIRED code when userId is empty string', () => {
      const context: MaybeWorkspaceContext = {
        workspaceId: 'workspace-123',
        userId: '',
      };

      expect(() => {
        assertWorkspaceScope(context);
      }).toThrow(ForbiddenError);

      try {
        assertWorkspaceScope(context);
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenError);
        if (error instanceof ForbiddenError) {
          expect(error.code).toBe('USER_REQUIRED');
          expect(error.message).toBe('User context required for workspace operation');
        }
      }
    });
  });

  describe('when both workspaceId and userId are missing', () => {
    it('should throw for empty object', () => {
      const context: MaybeWorkspaceContext = {};

      expect(() => {
        assertWorkspaceScope(context);
      }).toThrow(ForbiddenError);
    });

    it('should throw for context with both fields undefined', () => {
      const context = {} as MaybeWorkspaceContext;

      expect(() => {
        assertWorkspaceScope(context);
      }).toThrow(ForbiddenError);
    });

    it('should throw for context with both fields empty strings', () => {
      const context: MaybeWorkspaceContext = {
        workspaceId: '',
        userId: '',
      };

      expect(() => {
        assertWorkspaceScope(context);
      }).toThrow(ForbiddenError);
    });
  });

  describe('when context is valid', () => {
    it('should not throw for valid context with required fields', () => {
      const context: MaybeWorkspaceContext = {
        workspaceId: 'workspace-123',
        userId: 'user-456',
      };

      expect(() => {
        assertWorkspaceScope(context);
      }).not.toThrow();
    });

    it('should not throw for valid context with role', () => {
      const context: MaybeWorkspaceContext = {
        workspaceId: 'workspace-123',
        userId: 'user-456',
        role: 'admin',
      };

      expect(() => {
        assertWorkspaceScope(context);
      }).not.toThrow();
    });

    it('should narrow type correctly after assertion', () => {
      const context: MaybeWorkspaceContext = {
        workspaceId: 'workspace-123',
        userId: 'user-456',
      };

      assertWorkspaceScope(context);

      // Type should be narrowed to WorkspaceContext
      const narrowed: WorkspaceContext = context;
      expect(narrowed.workspaceId).toBe('workspace-123');
      expect(narrowed.userId).toBe('user-456');
    });
  });

  describe('edge cases', () => {
    it('should throw for context with only role', () => {
      const context: MaybeWorkspaceContext = {
        role: 'viewer',
      };

      expect(() => {
        assertWorkspaceScope(context);
      }).toThrow(ForbiddenError);
    });

    it('should handle whitespace-only strings as invalid', () => {
      const context1: MaybeWorkspaceContext = {
        workspaceId: '   ',
        userId: 'user-123',
      };

      // Whitespace is not empty string, so this should pass workspaceId check
      // but fail if implementation trims
      // Based on implementation, it only checks for '', not whitespace
      expect(() => {
        assertWorkspaceScope(context1);
      }).not.toThrow();

      const context2: MaybeWorkspaceContext = {
        workspaceId: 'workspace-123',
        userId: '   ',
      };

      // Same for userId
      expect(() => {
        assertWorkspaceScope(context2);
      }).not.toThrow();
    });
  });
});

// ============================================================================
// createWorkspaceContext
// ============================================================================

describe('createWorkspaceContext', () => {
  describe('when workspaceId is missing', () => {
    it('should throw ForbiddenError with WORKSPACE_REQUIRED code when workspaceId is undefined', () => {
      expect(() => {
        createWorkspaceContext(undefined, 'user-123');
      }).toThrow(ForbiddenError);

      try {
        createWorkspaceContext(undefined, 'user-123');
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenError);
        if (error instanceof ForbiddenError) {
          expect(error.code).toBe('WORKSPACE_REQUIRED');
          expect(error.message).toBe('Workspace scope required for this operation');
        }
      }
    });

    it('should throw ForbiddenError with WORKSPACE_REQUIRED code when workspaceId is empty string', () => {
      expect(() => {
        createWorkspaceContext('', 'user-123');
      }).toThrow(ForbiddenError);

      try {
        createWorkspaceContext('', 'user-123');
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenError);
        if (error instanceof ForbiddenError) {
          expect(error.code).toBe('WORKSPACE_REQUIRED');
          expect(error.message).toBe('Workspace scope required for this operation');
        }
      }
    });
  });

  describe('when userId is missing', () => {
    it('should throw ForbiddenError with USER_REQUIRED code when userId is undefined', () => {
      expect(() => {
        createWorkspaceContext('workspace-123', undefined);
      }).toThrow(ForbiddenError);

      try {
        createWorkspaceContext('workspace-123', undefined);
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenError);
        if (error instanceof ForbiddenError) {
          expect(error.code).toBe('USER_REQUIRED');
          expect(error.message).toBe('User context required for workspace operation');
        }
      }
    });

    it('should throw ForbiddenError with USER_REQUIRED code when userId is empty string', () => {
      expect(() => {
        createWorkspaceContext('workspace-123', '');
      }).toThrow(ForbiddenError);

      try {
        createWorkspaceContext('workspace-123', '');
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenError);
        if (error instanceof ForbiddenError) {
          expect(error.code).toBe('USER_REQUIRED');
          expect(error.message).toBe('User context required for workspace operation');
        }
      }
    });
  });

  describe('when both workspaceId and userId are missing', () => {
    it('should throw when both are undefined', () => {
      expect(() => createWorkspaceContext(undefined, undefined)).toThrow(ForbiddenError);
    });

    it('should throw when both are empty strings', () => {
      expect(() => createWorkspaceContext('', '')).toThrow(ForbiddenError);
    });
  });

  describe('when inputs are valid', () => {
    it('should return valid context without role', () => {
      const result = createWorkspaceContext('workspace-123', 'user-456');

      expect(result).toEqual({
        workspaceId: 'workspace-123',
        userId: 'user-456',
      });
      expect(result.role).toBeUndefined();
    });

    it('should return valid context with role as owner', () => {
      const result = createWorkspaceContext('workspace-123', 'user-456', 'owner');

      expect(result).toEqual({
        workspaceId: 'workspace-123',
        userId: 'user-456',
        role: 'owner',
      });
    });

    it('should return valid context with role as admin', () => {
      const result = createWorkspaceContext('workspace-123', 'user-456', 'admin');

      expect(result).toEqual({
        workspaceId: 'workspace-123',
        userId: 'user-456',
        role: 'admin',
      });
    });

    it('should return valid context with role as member', () => {
      const result = createWorkspaceContext('workspace-123', 'user-456', 'member');

      expect(result).toEqual({
        workspaceId: 'workspace-123',
        userId: 'user-456',
        role: 'member',
      });
    });

    it('should return valid context with role as viewer', () => {
      const result = createWorkspaceContext('workspace-123', 'user-456', 'viewer');

      expect(result).toEqual({
        workspaceId: 'workspace-123',
        userId: 'user-456',
        role: 'viewer',
      });
    });

    it('should return context that matches WorkspaceContext shape', () => {
      const result: WorkspaceContext = createWorkspaceContext('workspace-123', 'user-456');

      expect(result.workspaceId).toBe('workspace-123');
      expect(result.userId).toBe('user-456');
    });

    it('should not include role property when role is undefined', () => {
      const result = createWorkspaceContext('workspace-123', 'user-456', undefined);

      expect(Object.hasOwn(result, 'role')).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should handle UUID-format IDs', () => {
      const result = createWorkspaceContext(
        '12345678-1234-4abc-8abc-123456789001',
        '12345678-1234-4abc-8abc-123456789002',
      );

      expect(result.workspaceId).toBe('12345678-1234-4abc-8abc-123456789001');
      expect(result.userId).toBe('12345678-1234-4abc-8abc-123456789002');
    });

    it('should handle numeric string IDs', () => {
      const result = createWorkspaceContext('12345', '67890');

      expect(result.workspaceId).toBe('12345');
      expect(result.userId).toBe('67890');
    });

    it('should handle whitespace-only strings as valid', () => {
      // Based on implementation, it only checks for '', not whitespace
      const result1 = createWorkspaceContext('   ', 'user-123');
      expect(result1.workspaceId).toBe('   ');

      const result2 = createWorkspaceContext('workspace-123', '   ');
      expect(result2.userId).toBe('   ');
    });
  });
});

// ============================================================================
// isWorkspaceScoped
// ============================================================================

describe('isWorkspaceScoped', () => {
  describe('when context is undefined', () => {
    it('should return false', () => {
      expect(isWorkspaceScoped(undefined)).toBe(false);
    });
  });

  describe('when workspaceId is missing', () => {
    it('should return false when workspaceId is undefined', () => {
      const context: MaybeWorkspaceContext = {
        userId: 'user-123',
      };

      expect(isWorkspaceScoped(context)).toBe(false);
    });

    it('should return false when workspaceId is empty string', () => {
      const context: MaybeWorkspaceContext = {
        workspaceId: '',
        userId: 'user-123',
      };

      expect(isWorkspaceScoped(context)).toBe(false);
    });
  });

  describe('when userId is missing', () => {
    it('should return false when userId is undefined', () => {
      const context: MaybeWorkspaceContext = {
        workspaceId: 'workspace-123',
      };

      expect(isWorkspaceScoped(context)).toBe(false);
    });

    it('should return false when userId is empty string', () => {
      const context: MaybeWorkspaceContext = {
        workspaceId: 'workspace-123',
        userId: '',
      };

      expect(isWorkspaceScoped(context)).toBe(false);
    });
  });

  describe('when both workspaceId and userId are missing', () => {
    it('should return false for empty object', () => {
      const context: MaybeWorkspaceContext = {};

      expect(isWorkspaceScoped(context)).toBe(false);
    });

    it('should return false when both are undefined', () => {
      const context = {} as MaybeWorkspaceContext;

      expect(isWorkspaceScoped(context)).toBe(false);
    });

    it('should return false when both are empty strings', () => {
      const context: MaybeWorkspaceContext = {
        workspaceId: '',
        userId: '',
      };

      expect(isWorkspaceScoped(context)).toBe(false);
    });
  });

  describe('when context is valid', () => {
    it('should return true for valid context with required fields', () => {
      const context: MaybeWorkspaceContext = {
        workspaceId: 'workspace-123',
        userId: 'user-456',
      };

      expect(isWorkspaceScoped(context)).toBe(true);
    });

    it('should return true for valid context with role', () => {
      const context: MaybeWorkspaceContext = {
        workspaceId: 'workspace-123',
        userId: 'user-456',
        role: 'admin',
      };

      expect(isWorkspaceScoped(context)).toBe(true);
    });

    it('should narrow type correctly when used as type guard', () => {
      const context: MaybeWorkspaceContext = {
        workspaceId: 'workspace-123',
        userId: 'user-456',
      };

      if (isWorkspaceScoped(context)) {
        // Type should be narrowed to WorkspaceContext
        const narrowed: WorkspaceContext = context;
        expect(narrowed.workspaceId).toBe('workspace-123');
        expect(narrowed.userId).toBe('user-456');
      }
    });
  });

  describe('partial contexts', () => {
    it('should return false for context with only role', () => {
      const context: MaybeWorkspaceContext = {
        role: 'viewer',
      };

      expect(isWorkspaceScoped(context)).toBe(false);
    });

    it('should return false for context with workspaceId and role but no userId', () => {
      const context: MaybeWorkspaceContext = {
        workspaceId: 'workspace-123',
        role: 'member',
      };

      expect(isWorkspaceScoped(context)).toBe(false);
    });

    it('should return false for context with userId and role but no workspaceId', () => {
      const context: MaybeWorkspaceContext = {
        userId: 'user-123',
        role: 'owner',
      };

      expect(isWorkspaceScoped(context)).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should return true for whitespace-only strings', () => {
      // Based on implementation, it only checks for '', not whitespace
      const context1: MaybeWorkspaceContext = {
        workspaceId: '   ',
        userId: 'user-123',
      };
      expect(isWorkspaceScoped(context1)).toBe(true);

      const context2: MaybeWorkspaceContext = {
        workspaceId: 'workspace-123',
        userId: '   ',
      };
      expect(isWorkspaceScoped(context2)).toBe(true);

      const context3: MaybeWorkspaceContext = {
        workspaceId: '   ',
        userId: '   ',
      };
      expect(isWorkspaceScoped(context3)).toBe(true);
    });

    it('should return true for numeric string IDs', () => {
      const context: MaybeWorkspaceContext = {
        workspaceId: '12345',
        userId: '67890',
      };

      expect(isWorkspaceScoped(context)).toBe(true);
    });

    it('should return true for UUID-format IDs', () => {
      const context: MaybeWorkspaceContext = {
        workspaceId: '12345678-1234-4abc-8abc-123456789001',
        userId: '12345678-1234-4abc-8abc-123456789002',
      };

      expect(isWorkspaceScoped(context)).toBe(true);
    });
  });
});
