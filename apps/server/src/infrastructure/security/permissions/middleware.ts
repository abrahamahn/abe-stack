// apps/server/src/infrastructure/security/permissions/middleware.ts
/**
 * Permission Middleware
 *
 * Fastify preHandler hooks for permission checks.
 * Integrates with the existing auth middleware.
 */

import { isDenied, type PermissionRecord, type PermissionType, type RecordPointer } from './types';

import type { PermissionChecker } from './checker';
import type { UserRole } from '@abe-stack/core';
import type { FastifyReply, FastifyRequest } from 'fastify';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * A preHandler hook function type (without `this` binding)
 */
export type PreHandlerHook = (request: FastifyRequest, reply: FastifyReply) => Promise<void> | void;

// ============================================================================
// Type Extensions
// ============================================================================

/**
 * Extend FastifyRequest to include permission context
 */
declare module 'fastify' {
  interface FastifyRequest {
    /** User from auth middleware */
    user?: {
      userId: string;
      role: UserRole;
      [key: string]: unknown;
    };
    /** Permission check result */
    permissionResult?: {
      allowed: boolean;
      reason?: string;
      matchedRule?: string;
    };
    /** Loaded record for permission check */
    permissionRecord?: PermissionRecord;
  }
}

// ============================================================================
// Middleware Options
// ============================================================================

/**
 * Options for creating permission middleware
 */
export interface PermissionMiddlewareOptions {
  /** Permission checker instance */
  checker: PermissionChecker;
  /** Function to extract record pointer from request */
  getRecordPointer?: (request: FastifyRequest) => RecordPointer | null;
  /** Function to extract the operation type from request */
  getOperation?: (request: FastifyRequest) => 'create' | 'update' | 'delete';
  /** Custom error handler */
  onDenied?: (request: FastifyRequest, reply: FastifyReply, reason: string) => void | Promise<void>;
}

/**
 * Options for a single permission guard
 */
export interface PermissionGuardOptions {
  /** Table name */
  table: string;
  /** Permission type to check */
  permission: PermissionType;
  /** Function to get record ID from request params */
  getRecordId?: (request: FastifyRequest) => string | null;
  /** Operation type (for write permissions) */
  operation?: 'create' | 'update' | 'delete';
}

// ============================================================================
// Default Extractors
// ============================================================================

/**
 * Default function to extract record pointer from request
 * Looks for table and id in params or body
 */
function defaultGetRecordPointer(request: FastifyRequest): RecordPointer | null {
  const params = request.params as Record<string, string> | undefined;
  const body = request.body as Record<string, unknown> | undefined;

  // Try params first
  const table = params?.['table'];
  const id = params?.['id'] ?? params?.['recordId'];

  if (table != null && table !== '' && id != null && id !== '') {
    return { table, id };
  }

  // Try body
  const bodyTable = body?.['table'] as string | undefined;
  const bodyId = (body?.['id'] ?? body?.['recordId']) as string | undefined;

  if (bodyTable != null && bodyTable !== '' && bodyId != null && bodyId !== '') {
    return { table: bodyTable, id: bodyId };
  }

  return null;
}

/**
 * Default function to extract operation from request method
 */
function defaultGetOperation(request: FastifyRequest): 'create' | 'update' | 'delete' {
  switch (request.method) {
    case 'POST':
      return 'create';
    case 'DELETE':
      return 'delete';
    default:
      return 'update';
  }
}

/**
 * Default handler for denied permissions
 */
function defaultOnDenied(_request: FastifyRequest, reply: FastifyReply, reason: string): void {
  void reply.status(403).send({
    message: 'Forbidden',
    error: reason,
  });
}

// ============================================================================
// Middleware Factory
// ============================================================================

/**
 * Create permission middleware for a Fastify instance
 */
export function createPermissionMiddleware(options: PermissionMiddlewareOptions): {
  requireReadPermission: (
    table?: string,
    getRecordId?: (request: FastifyRequest) => string | null,
  ) => PreHandlerHook;
  requireWritePermission: (
    table?: string,
    getRecordId?: (request: FastifyRequest) => string | null,
    operation?: 'create' | 'update' | 'delete',
  ) => PreHandlerHook;
  requireDeletePermission: (
    table?: string,
    getRecordId?: (request: FastifyRequest) => string | null,
  ) => PreHandlerHook;
  requireAdminPermission: (
    table?: string,
    getRecordId?: (request: FastifyRequest) => string | null,
  ) => PreHandlerHook;
  createPermissionGuard: (guardOptions: PermissionGuardOptions) => PreHandlerHook;
  filterRecordsMiddleware: <T extends PermissionRecord>(
    request: FastifyRequest,
    table: string,
    records: T[],
  ) => Promise<T[]>;
  checker: PermissionChecker;
} {
  const {
    checker,
    getRecordPointer = defaultGetRecordPointer,
    getOperation = defaultGetOperation,
    onDenied = defaultOnDenied,
  } = options;

  /**
   * Create a preHandler that checks read permission
   */
  function requireReadPermission(
    table?: string,
    getRecordId?: (request: FastifyRequest) => string | null,
  ): PreHandlerHook {
    const guardOpts: PermissionGuardOptions = {
      table: table ?? '',
      permission: 'read',
    };
    if (getRecordId !== undefined) {
      guardOpts.getRecordId = getRecordId;
    }
    return createPermissionGuard(guardOpts);
  }

  /**
   * Create a preHandler that checks write permission
   */
  function requireWritePermission(
    table?: string,
    getRecordId?: (request: FastifyRequest) => string | null,
    operation?: 'create' | 'update' | 'delete',
  ): PreHandlerHook {
    const guardOpts: PermissionGuardOptions = {
      table: table ?? '',
      permission: 'write',
    };
    if (getRecordId !== undefined) {
      guardOpts.getRecordId = getRecordId;
    }
    if (operation !== undefined) {
      guardOpts.operation = operation;
    }
    return createPermissionGuard(guardOpts);
  }

  /**
   * Create a preHandler that checks delete permission
   */
  function requireDeletePermission(
    table?: string,
    getRecordId?: (request: FastifyRequest) => string | null,
  ): PreHandlerHook {
    const guardOpts: PermissionGuardOptions = {
      table: table ?? '',
      permission: 'delete',
      operation: 'delete',
    };
    if (getRecordId !== undefined) {
      guardOpts.getRecordId = getRecordId;
    }
    return createPermissionGuard(guardOpts);
  }

  /**
   * Create a preHandler that checks admin permission
   */
  function requireAdminPermission(
    table?: string,
    getRecordId?: (request: FastifyRequest) => string | null,
  ): PreHandlerHook {
    const guardOpts: PermissionGuardOptions = {
      table: table ?? '',
      permission: 'admin',
    };
    if (getRecordId !== undefined) {
      guardOpts.getRecordId = getRecordId;
    }
    return createPermissionGuard(guardOpts);
  }

  /**
   * Create a custom permission guard
   */
  function createPermissionGuard(guardOptions: PermissionGuardOptions): PreHandlerHook {
    return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      // Check if user is authenticated
      if (request.user === undefined || request.user.userId === '') {
        void reply.status(401).send({ message: 'Unauthorized' });
        return;
      }

      const userId = request.user.userId;
      const userRole = request.user.role;

      // Get record pointer
      let pointer: RecordPointer | null = null;

       if (guardOptions.getRecordId != null) {
        const recordId = guardOptions.getRecordId(request);
        if (recordId != null && recordId !== '' && guardOptions.table !== '') {
          pointer = { table: guardOptions.table, id: recordId };
         }
       } else if (guardOptions.table !== '') {
         // Try to get ID from params
         const params = request.params as Record<string, string> | undefined;
         const id = params?.['id'] ?? params?.['recordId'];
         if (id != null && id !== '') {
          pointer = { table: guardOptions.table, id };
        }
      } else {
        pointer = getRecordPointer(request);
      }

       // For create operations, we don't need a record pointer
       const operation = guardOptions.operation ?? getOperation(request);
       if (operation === 'create' && pointer == null && guardOptions.table !== '') {
        // Check write permission for create
        const result = await checker.checkWritePermission(
          userId,
          userRole,
          guardOptions.table,
          '', // Empty ID for create
          'create',
        );

        request.permissionResult = result;

        if (isDenied(result)) {
          await onDenied(request, reply, result.reason);
        }
         return;
       }

       if (pointer == null) {
        void reply.status(400).send({
          message: 'Bad Request',
          error: 'Could not determine record to check permissions for',
        });
        return;
      }

      // Check permission based on type
      let result;
      switch (guardOptions.permission) {
        case 'read':
          result = await checker.checkReadPermission(userId, userRole, pointer.table, pointer.id);
          break;

        case 'write':
          result = await checker.checkWritePermission(
            userId,
            userRole,
            pointer.table,
            pointer.id,
            operation,
          );
          break;

        case 'delete':
          result = await checker.checkWritePermission(
            userId,
            userRole,
            pointer.table,
            pointer.id,
            'delete',
          );
          break;

        case 'admin':
          result = await checker.checkAdminPermission(userId, userRole, pointer.table, pointer.id);
          break;
      }

      // Store result on request
      request.permissionResult = result;

      // Handle denied
      if (isDenied(result)) {
        await onDenied(request, reply, result.reason);
      }
    };
  }

  /**
   * Middleware to filter response records
   * Call this after fetching records to filter out inaccessible ones
   */
  async function filterRecordsMiddleware<T extends PermissionRecord>(
    request: FastifyRequest,
    table: string,
     records: T[],
   ): Promise<T[]> {
     if (request.user == null || request.user.userId === '') {
      return [];
    }
    const user = request.user;

    return checker.filterReadableRecords(user.userId, user.role, table, records);
  }

  return {
    /** Check read permission */
    requireReadPermission,
    /** Check write permission */
    requireWritePermission,
    /** Check delete permission */
    requireDeletePermission,
    /** Check admin permission */
    requireAdminPermission,
    /** Create custom permission guard */
    createPermissionGuard,
    /** Filter records to readable ones */
    filterRecordsMiddleware,
    /** The underlying permission checker */
    checker,
  };
}

// ============================================================================
// Standalone Guards
// ============================================================================

/**
 * Create a standalone permission guard without the middleware factory
 * Useful for one-off permission checks
 */
export function createStandalonePermissionGuard(
  checker: PermissionChecker,
  options: {
    permission: PermissionType;
    table: string;
    getRecordId: (request: FastifyRequest) => string | null;
    operation?: 'create' | 'update' | 'delete';
    onDenied?: (request: FastifyRequest, reply: FastifyReply, reason: string) => void;
  },
): PreHandlerHook {
  const { permission, table, getRecordId, operation, onDenied = defaultOnDenied } = options;

   return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
     if (request.user == null || request.user.userId === '') {
      void reply.status(401).send({ message: 'Unauthorized' });
      return;
    }
    const user = request.user;

    const recordId = getRecordId(request);
    if ((recordId == null || recordId === '') && operation !== 'create') {
      void reply.status(400).send({
        message: 'Bad Request',
        error: 'Record ID required',
      });
      return;
    }

    let result;
    switch (permission) {
      case 'read':
        result = await checker.checkReadPermission(
          user.userId,
          user.role,
          table,
          recordId ?? '',
        );
        break;

      case 'write':
        result = await checker.checkWritePermission(
          user.userId,
          user.role,
          table,
          recordId ?? '',
          operation,
        );
        break;

      case 'delete':
        result = await checker.checkWritePermission(
          user.userId,
          user.role,
          table,
          recordId ?? '',
          'delete',
        );
        break;

      case 'admin':
        result = await checker.checkAdminPermission(
          user.userId,
          user.role,
          table,
          recordId ?? '',
        );
        break;
    }

    request.permissionResult = result;

    if (isDenied(result)) {
      onDenied(request, reply, result.reason);
    }
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if the current request has a specific permission result
 */
export function hasPermission(request: FastifyRequest): boolean {
  return request.permissionResult?.allowed === true;
}

/**
 * Get the permission denial reason from the request
 */
export function getPermissionDenialReason(request: FastifyRequest): string | undefined {
  if (request.permissionResult?.allowed === false) {
    return request.permissionResult.reason;
  }
  return undefined;
}

/**
 * Get record ID from common param names
 */
export function getRecordIdFromParams(
  request: FastifyRequest,
   paramNames: string[] = ['id', 'recordId'],
 ): string | null {
   const params = request.params as Record<string, string> | undefined;
   if (params == null) return null;

  for (const name of paramNames) {
    if (params[name] != null && params[name] !== '') {
      return params[name] ?? null;
    }
  }
  return null;
}
