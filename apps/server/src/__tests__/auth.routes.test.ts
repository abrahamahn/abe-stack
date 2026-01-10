// apps/server/src/__tests__/auth.routes.test.ts
import { randomUUID } from 'crypto';

import Fastify from 'fastify';
import { expect, test } from 'vitest';

import { hashPassword } from '../lib/password';
import { registerRoutes } from '../routes';

import type { DbClient } from '@abe-stack/db';
import type { FastifyInstance } from 'fastify';

type TestUser = {
  id: string;
  email: string;
  passwordHash: string;
  name: string | null;
  createdAt: Date;
};

type TestDb = {
  query: {
    users: {
      findFirst: (args: { where: unknown }) => Promise<TestUser | undefined>;
    };
  };
  insert: (table: unknown) => {
    values: (values: Partial<TestUser>) => {
      returning: () => Promise<TestUser[]>;
    };
  };
  execute: () => Promise<void>;
};

function createTestDb(seed: TestUser[] = []): { db: TestDb; users: TestUser[] } {
  const users = [...seed];

  const getEmailFromWhere = (where: unknown): string | undefined => {
    if (where && typeof where === 'object') {
      // drizzle eq() shape typically exposes `right.value`
      const rightValue = (where as { right?: { value?: string } }).right?.value;
      if (typeof rightValue === 'string') return rightValue;
    }
    return undefined;
  };

  const db: TestDb = {
    query: {
      users: {
        findFirst: ({ where }): Promise<TestUser | undefined> => {
          const email = getEmailFromWhere(where);
          if (email) {
            return Promise.resolve(users.find((u) => u.email === email));
          }
          return Promise.resolve(undefined);
        },
      },
    },
    insert: () => ({
      values: (values) => ({
        returning: (): Promise<TestUser[]> => {
          const user: TestUser = {
            id: values.id ?? randomUUID(),
            email: values.email ?? 'missing@example.com',
            passwordHash: values.passwordHash ?? '',
            name: values.name ?? null,
            createdAt: values.createdAt ?? new Date(),
          };
          users.push(user);
          return Promise.resolve([user]);
        },
      }),
    }),
    execute: () => Promise.resolve(),
  };

  return { db, users };
}

async function createTestApp(
  seed?: TestUser[],
): Promise<{ app: FastifyInstance; users: TestUser[] }> {
  const app = Fastify({ logger: false });
  const { db, users } = createTestDb(seed);
  app.decorate('db', db as unknown as DbClient);
  registerRoutes(app);
  await app.ready();
  return { app, users };
}

test('registers a new user and returns token', async () => {
  process.env.JWT_SECRET = 'super-secret-test-key-should-be-long';
  const { app, users } = await createTestApp();

  const response = await app.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: { email: 'new@example.com', password: 'pass1234', name: 'New User' },
  });

  expect(response.statusCode).toBe(201);
  const body = response.json<{ token?: string; user: { email: string } }>();
  expect(body.token).toBeDefined();
  expect(body.user.email).toBe('new@example.com');
  expect(users).toHaveLength(1);

  await app.close();
});

test('prevents duplicate registration', async () => {
  process.env.JWT_SECRET = 'super-secret-test-key-should-be-long';
  const existing: TestUser = {
    id: randomUUID(),
    email: 'dupe@example.com',
    passwordHash: await hashPassword('existing'),
    name: 'Existing',
    createdAt: new Date(),
  };
  const { app, users } = await createTestApp([existing]);

  const response = await app.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: { email: 'dupe@example.com', password: 'pass1234', name: 'Another' },
  });

  expect(response.statusCode).toBe(409);
  expect(users).toHaveLength(1);

  await app.close();
});

test('logs in an existing user with correct password', async () => {
  process.env.JWT_SECRET = 'super-secret-test-key-should-be-long';
  const passwordHash = await hashPassword('correct-password');
  const existing: TestUser = {
    id: randomUUID(),
    email: 'login@example.com',
    passwordHash,
    name: 'Login User',
    createdAt: new Date(),
  };
  const { app } = await createTestApp([existing]);

  const response = await app.inject({
    method: 'POST',
    url: '/api/auth/login',
    payload: { email: 'login@example.com', password: 'correct-password' },
  });

  expect(response.statusCode).toBe(200);
  const body = response.json<{ token?: string }>();
  expect(body.token).toBeDefined();

  await app.close();
});

test('rejects login with bad password', async () => {
  process.env.JWT_SECRET = 'super-secret-test-key-should-be-long';
  const passwordHash = await hashPassword('correct-password');
  const existing: TestUser = {
    id: randomUUID(),
    email: 'badpass@example.com',
    passwordHash,
    name: 'Bad Pass',
    createdAt: new Date(),
  };
  const { app } = await createTestApp([existing]);

  const response = await app.inject({
    method: 'POST',
    url: '/api/auth/login',
    payload: { email: 'badpass@example.com', password: 'wrong-password' },
  });

  expect(response.statusCode).toBe(401);
  const body = response.json<{ token?: string }>();
  expect(body.token).toBeUndefined();

  await app.close();
});

test('rejects weak password during registration', async () => {
  process.env.JWT_SECRET = 'super-secret-test-key-should-be-long';
  const { app } = await createTestApp();

  const response = await app.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: { email: 'weak@example.com', password: '123', name: 'Weak Password' },
  });

  expect(response.statusCode).toBe(400);
  const body = response.json<{ message: string }>();
  expect(body.message).toContain('Password');

  await app.close();
});

test('accepts strong password during registration', async () => {
  process.env.JWT_SECRET = 'super-secret-test-key-should-be-long';
  const { app } = await createTestApp();

  const response = await app.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: {
      email: 'strong@example.com',
      password: 'MySecureP@ssw0rd!2024',
      name: 'Strong Password',
    },
  });

  expect(response.statusCode).toBe(201);
  const body = response.json<{ token?: string }>();
  expect(body.token).toBeDefined();

  await app.close();
});
