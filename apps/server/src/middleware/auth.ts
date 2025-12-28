import { verifyToken, type TokenPayload } from '../lib/jwt';

import type { FastifyReply, FastifyRequest } from 'fastify';

export async function authMiddleware(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<FastifyReply> {
  try {
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return await reply.code(401).send({ message: 'Missing or invalid authorization header' });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    const payload: TokenPayload = verifyToken(token);

    // Attach user info to request
    request.user = payload;
  } catch {
    return await reply.code(401).send({ message: 'Invalid or expired token' });
  }

  return reply;
}
