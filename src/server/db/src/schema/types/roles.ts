// backend/db/src/schema/types/roles.ts
export type UserRole = 'user' | 'admin' | 'moderator';

export const USER_ROLES: UserRole[] = ['user', 'admin', 'moderator'];
