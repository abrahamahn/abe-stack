// src/server/core/src/auth/security/sudo.ts
/**
 * Sudo Mode Middleware
 *
 * Fastify preHandler that verifies the x-sudo-token header.
 * Applied to sensitive routes (account deletion, ownership transfer, etc.).
 *
 * @module security/sudo
 */

import { HTTP_STATUS, SUDO_TOKEN_HEADER } from '@abe-stack/shared';

import { verifySudoToken } from '../handlers/sudo';

import type { FastifyReply, FastifyRequest } from 'fastify';

/**
 * Create a Fastify preHandler that requires a valid sudo token.
 *
 * @param jwtSecret - The JWT secret used to verify the sudo token
 * @returns Fastify preHandler function
 */
export function createRequireSudo(jwtSecret: string) {
  return function requireSudo(request: FastifyRequest, reply: FastifyReply): void {
    const token = request.headers[SUDO_TOKEN_HEADER];
    if (typeof token !== 'string' || token === '') {
      void reply.status(HTTP_STATUS.FORBIDDEN).send({
        message: 'Sudo authentication required. Please re-verify your identity.',
        code: 'SUDO_REQUIRED',
      });
      return;
    }

    const result = verifySudoToken(token, jwtSecret);
    if (result === null) {
      void reply.status(HTTP_STATUS.FORBIDDEN).send({
        message: 'Sudo token is invalid or expired. Please re-verify your identity.',
        code: 'SUDO_EXPIRED',
      });
      return;
    }

    // Verify the sudo token belongs to the authenticated user
    const userId = (request as unknown as { user?: { userId: string } }).user?.userId;
    if (userId !== undefined && result.userId !== userId) {
      void reply.status(HTTP_STATUS.FORBIDDEN).send({
        message: 'Sudo token does not match authenticated user.',
        code: 'SUDO_MISMATCH',
      });
      return;
    }
  };
}
