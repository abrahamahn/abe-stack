// packages/core/src/contracts/api.ts
/**
 * Combined API Contract
 *
 * Combines all domain contracts into a single API contract.
 * This is the main export used by clients and servers.
 */

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
