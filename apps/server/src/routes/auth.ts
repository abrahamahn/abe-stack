import { users } from '@abe-stack/db';
import { loginRequestSchema, registerRequestSchema } from '@abe-stack/shared';
import { eq } from 'drizzle-orm';

import { createToken } from '../lib/jwt';
import { hashPassword, comparePassword } from '../lib/password';

import type { FastifyInstance } from 'fastify';

export function authRoutes(app: FastifyInstance): void {
  // POST /auth/register
  app.post('/auth/register', async (request, reply) => {
    try {
      // Validate request body
      const body = registerRequestSchema.parse(request.body);

      // Check if user already exists
      const existingUser = await app.db.query.users.findFirst({
        where: eq(users.email, body.email),
      });

      if (existingUser) {
        return await reply.code(409).send({ message: 'Email already registered' });
      }

      // Hash password and create user
      const passwordHash = await hashPassword(body.password);

      const [user] = await app.db
        .insert(users)
        .values({
          email: body.email,
          name: body.name || null,
          passwordHash,
        })
        .returning();

      if (!user) {
        return await reply.code(500).send({ message: 'Failed to create user' });
      }

      // Create JWT token
      const token = createToken(user.id, user.email);

      return {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
      };
    } catch (error) {
      if (error instanceof Error && error.name === 'ZodError') {
        return await reply.code(400).send({ message: 'Invalid request data' });
      }
      app.log.error(error);
      return await reply.code(500).send({ message: 'Internal server error' });
    }
  });

  // POST /auth/login
  app.post('/auth/login', async (request, reply) => {
    try {
      // Validate request body
      const body = loginRequestSchema.parse(request.body);

      // Find user
      const user = await app.db.query.users.findFirst({
        where: eq(users.email, body.email),
      });

      if (!user) {
        return await reply.code(401).send({ message: 'Invalid email or password' });
      }

      // Verify password
      const isValid = await comparePassword(body.password, user.passwordHash);

      if (!isValid) {
        return await reply.code(401).send({ message: 'Invalid email or password' });
      }

      // Create JWT token
      const token = createToken(user.id, user.email);

      return {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
      };
    } catch (error) {
      if (error instanceof Error && error.name === 'ZodError') {
        return await reply.code(400).send({ message: 'Invalid request data' });
      }
      app.log.error(error);
      return await reply.code(500).send({ message: 'Internal server error' });
    }
  });
}
