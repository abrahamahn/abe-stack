/**
 * Authentication Middleware
 *
 * These functions are designed to be used as Fastify preHandler hooks.
 * They require the JWT secret to be passed when creating the guards.
 *
 * Uses a locally-defined AuthenticatedFastifyRequest to avoid relying on
 * global module augmentation, which can be fragile across package boundaries.
 *
 * @module middleware
 */
import { type TokenPayload } from './utils/jwt';
import type { UserRole } from '@abe-stack/core';
import type { FastifyReply, FastifyRequest } from 'fastify';
/**
 * Extract and verify token from Authorization header.
 *
 * @param request - Fastify request object
 * @param secret - JWT signing secret
 * @returns Decoded token payload or null if invalid
 * @complexity O(1)
 */
export declare function extractTokenPayload(request: FastifyRequest, secret: string): TokenPayload | null;
/**
 * Create an authentication guard that requires a valid access token.
 *
 * @param secret - JWT signing secret
 * @returns Fastify preHandler hook function
 * @complexity O(1)
 */
export declare function createRequireAuth(secret: string): (request: FastifyRequest, reply: FastifyReply) => void;
/**
 * Create a role-based authorization guard.
 *
 * @param secret - JWT signing secret
 * @param allowedRoles - Roles permitted to access the endpoint
 * @returns Async Fastify preHandler hook function
 * @complexity O(n) where n is the number of allowed roles
 */
export declare function createRequireRole(secret: string, ...allowedRoles: UserRole[]): (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
/**
 * Check if user has admin role.
 *
 * @param request - Fastify request object
 * @returns True if user is an admin
 * @complexity O(1)
 */
export declare function isAdmin(request: FastifyRequest): boolean;
/** Fastify preHandler hook type */
type AuthHandler = (request: FastifyRequest, reply: FastifyReply) => void | Promise<void>;
/**
 * Create a preHandler hook that requires authentication and specific roles.
 *
 * @param secret - JWT signing secret
 * @param allowedRoles - Roles permitted to access (empty = any authenticated)
 * @returns Fastify preHandler hook function
 * @complexity O(1)
 */
export declare function createAuthGuard(secret: string, ...allowedRoles: UserRole[]): AuthHandler;
export {};
//# sourceMappingURL=middleware.d.ts.map