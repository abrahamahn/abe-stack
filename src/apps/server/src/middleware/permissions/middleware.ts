// apps/server/src/middleware/permissions/middleware.ts
/**
 * Permission Middleware
 *
 * Fastify preHandler hooks for permission checks.
 * Integrates with the existing auth middleware.
 *
 * @module apps/server/middleware/permissions
 */

import {
  isDenied,
  type PermissionChecker,
  type PermissionRecord,
  type PermissionType,
  type RecordPointer,
} from '@abe-stack/server-engine';

import type { UserRole } from '@abe-stack/db';
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
 *
 * @param checker - Permission checker instance
 * @param getRecordPointer - Function to extract record pointer from request
 * @param getOperation - Function to extract the operation type from request
 * @param onDenied - Custom error handler
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
 *
 * @param table - Table name
 * @param permission - Permission type to check
 * @param getRecordId - Function to get record ID from request params
 * @param operation - Operation type (for write permissions)
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
 * Default function to extract record pointer from request.
 * Looks for table and id in params or body.
 *
 * @param request - The Fastify request
 * @returns Record pointer or null if not found
 */
function defaultGetRecordPointer(request: FastifyRequest): RecordPointer | null {
  const params = request.params as Record<string, string> | undefined;
  const body = request.body as Record<string, unknown> | undefined;

  const table = params?.['table'];
  const id = params?.['id'] ?? params?.['recordId'];

  if (table != null && table !== '' && id != null && id !== '') {
    return { table, id };
  }

  const bodyTable = body?.['table'] as string | undefined;
  const bodyId = (body?.['id'] ?? body?.['recordId']) as string | undefined;

  if (bodyTable != null && bodyTable !== '' && bodyId != null && bodyId !== '') {
    return { table: bodyTable, id: bodyId };
  }

  return null;
}

/**
 * Default function to extract operation from request method
 *
 * @param request - The Fastify request
 * @returns The operation type based on HTTP method
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
 *
 * @param _request - The Fastify request (unused)
 * @param reply - The Fastify reply
 * @param reason - The denial reason
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
 *
 * @param options - Middleware options including checker and extractors
 * @returns Object with permission guard functions and utilities
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
      if (request.user === undefined || request.user.userId === '') {
        void reply.status(401).send({ message: 'Unauthorized' });
        return;
      }

      const userId = request.user.userId;
      const userRole = request.user.role;

      let pointer: RecordPointer | null = null;

      if (guardOptions.getRecordId != null) {
        const recordId = guardOptions.getRecordId(request);
        if (recordId != null && recordId !== '' && guardOptions.table !== '') {
          pointer = { table: guardOptions.table, id: recordId };
        }
      } else if (guardOptions.table !== '') {
        const params = request.params as Record<string, string> | undefined;
        const id = params?.['id'] ?? params?.['recordId'];
        if (id != null && id !== '') {
          pointer = { table: guardOptions.table, id };
        }
      } else {
        pointer = getRecordPointer(request);
      }

      const operation = guardOptions.operation ?? getOperation(request);
      if (operation === 'create' && pointer == null && guardOptions.table !== '') {
        const result = await checker.checkWritePermission(
          userId,
          userRole,
          guardOptions.table,
          '',
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

      request.permissionResult = result;

      if (isDenied(result)) {
        await onDenied(request, reply, result.reason);
      }
    };
  }

  /**
   * Middleware to filter response records.
   * Call this after fetching records to filter out inaccessible ones.
   *
   * @param request - The Fastify request
   * @param table - Table name
   * @param records - Records to filter
   * @returns Filtered array of readable records
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
    requireReadPermission,
    requireWritePermission,
    requireDeletePermission,
    requireAdminPermission,
    createPermissionGuard,
    filterRecordsMiddleware,
    checker,
  };
}

// ============================================================================
// Standalone Guards
// ============================================================================

/**
 * Create a standalone permission guard without the middleware factory.
 * Useful for one-off permission checks.
 *
 * @param checker - The permission checker instance
 * @param options - Guard options
 * @returns A PreHandlerHook function
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
        result = await checker.checkReadPermission(user.userId, user.role, table, recordId ?? '');
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
        result = await checker.checkAdminPermission(user.userId, user.role, table, recordId ?? '');
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
 *
 * @param request - The Fastify request
 * @returns True if the permission was allowed
 */
export function hasPermission(request: FastifyRequest): boolean {
  return request.permissionResult?.allowed === true;
}

/**
 * Get the permission denial reason from the request
 *
 * @param request - The Fastify request
 * @returns The denial reason string, or undefined if allowed
 */
export function getPermissionDenialReason(request: FastifyRequest): string | undefined {
  if (request.permissionResult?.allowed === false) {
    return request.permissionResult.reason;
  }
  return undefined;
}

/**
 * Get record ID from common param names
 *
 * @param request - The Fastify request
 * @param paramNames - Array of param names to check (default: ['id', 'recordId'])
 * @returns The record ID string, or null if not found
 * @complexity O(k) where k is the number of param names
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
