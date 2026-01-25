// packages/contracts/src/api.ts
/**
 * Combined API Contract
 *
 * Combines all domain contracts into a single API contract.
 * This is the main export used by clients and servers.
 */

import { adminContract } from './admin';
import { authContract } from './auth';
import { usersContract } from './users';

import type { ContractRouter } from './types';

export const apiContract = {
  auth: authContract,
  users: usersContract,
  admin: adminContract,
} satisfies ContractRouter;

export type ApiContract = typeof apiContract;
