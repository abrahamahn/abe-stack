import { users } from '@abe-stack/db';
import { eq } from 'drizzle-orm';

import { authMiddleware } from '../middleware/auth';

import type { FastifyInstance } from 'fastify';

export function userRoutes(app: FastifyInstance): void {
  // GET /users/me - Get current user (protected)
  app.get(
    '/users/me',
    {
      onRequest: (request, reply) => {
        void authMiddleware(request, reply);
      },
    },
    async (request, reply) => {
      try {
        const userId = request.user?.userId;

        if (!userId) {
          return await reply.code(401).send({ message: 'Unauthorized' });
        }

        const user = await app.db.query.users.findFirst({
          where: eq(users.id, userId),
        });

        if (!user) {
          return await reply.code(404).send({ message: 'User not found' });
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          createdAt: user.createdAt.toISOString(),
        };
      } catch (error) {
        app.log.error(error);
        return await reply.code(500).send({ message: 'Internal server error' });
      }
    },
  );
}
