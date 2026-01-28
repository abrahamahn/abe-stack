// apps/web/src/features/auth/utils/redirects.ts

interface UserLocal {
  role?: string;
}

export function getPostLoginRedirect(user: UserLocal | null | undefined): string {
  if (user?.role === 'admin') {
    return '/admin';
  }

  return '/settings';
}
