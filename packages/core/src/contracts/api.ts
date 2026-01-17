// packages/core/src/contracts/api.ts
import { initContract } from '@ts-rest/core';

import { adminContract } from './admin';
import { authContract } from './auth';
import { usersContract } from './users';

const c = initContract();

export const apiContract = c.router({
  auth: authContract,
  users: usersContract,
  admin: adminContract,
});

export type ApiContract = typeof apiContract;
