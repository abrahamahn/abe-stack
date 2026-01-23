// apps/web/src/features/auth/utils/redirects.ts
import type { User } from '@features/auth';

export function getPostLoginRedirect(user: User | null | undefined): string {
  if (user?.role === 'admin') {
    return '/admin';
  }

  return '/settings';
}
