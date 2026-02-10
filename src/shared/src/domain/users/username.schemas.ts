// src/shared/src/domain/users/username.schemas.ts
import { createSchema, parseString } from '../../core/schema.utils';

import type { Schema } from '../../core/api';

/** Username cooldown period in days */
export const USERNAME_CHANGE_COOLDOWN_DAYS = 30;

/** Reserved usernames that cannot be used */
export const RESERVED_USERNAMES = [
  'admin',
  'administrator',
  'support',
  'system',
  'help',
  'root',
  'mod',
  'moderator',
  'staff',
  'team',
  'official',
  'info',
  'security',
  'abuse',
  'postmaster',
  'webmaster',
  'noreply',
  'null',
  'undefined',
  'api',
  'www',
  'mail',
  'ftp',
] as const;

/** Username validation regex: 2-30 chars, lowercase alphanumeric + underscores, must start with letter */
const USERNAME_REGEX = /^[a-z][a-z0-9_]{1,29}$/;

export interface UpdateUsernameRequest {
  username: string;
}

export interface UpdateUsernameResponse {
  username: string;
  nextChangeAllowedAt: string;
}

export const updateUsernameRequestSchema: Schema<UpdateUsernameRequest> = createSchema(
  (data: unknown) => {
    const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;
    const username = parseString(obj['username'], 'username', { min: 2, trim: true }).toLowerCase();
    if (!USERNAME_REGEX.test(username)) {
      throw new Error(
        'Username must be 2-30 characters, start with a letter, and contain only lowercase letters, numbers, and underscores',
      );
    }
    if ((RESERVED_USERNAMES as readonly string[]).includes(username)) {
      throw new Error('This username is reserved');
    }
    return { username };
  },
);

/**
 * Check if a username change is within the cooldown period.
 */
export function isUsernameChangeCooldownActive(lastChange: Date | null): boolean {
  if (lastChange === null) return false;
  const cooldownEnd = new Date(
    lastChange.getTime() + USERNAME_CHANGE_COOLDOWN_DAYS * 24 * 60 * 60 * 1000,
  );
  return new Date() < cooldownEnd;
}

/**
 * Get the date when the next username change will be allowed.
 */
export function getNextUsernameChangeDate(lastChange: Date | null): Date {
  if (lastChange === null) return new Date();
  return new Date(lastChange.getTime() + USERNAME_CHANGE_COOLDOWN_DAYS * 24 * 60 * 60 * 1000);
}
