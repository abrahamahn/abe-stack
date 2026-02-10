// src/apps/web/src/features/auth/utils/redirects.ts

interface UserLocal {
  role?: string;
}

/**
 * Validate that a redirect path is safe (prevents open-redirect attacks).
 * Only allows relative paths starting with a single slash.
 */
function isSafeRedirectPath(path: string): boolean {
  if (!path.startsWith('/')) return false;
  if (path.startsWith('//')) return false;
  const decoded = decodeURIComponent(path).toLowerCase();
  if (decoded.startsWith('javascript:') || decoded.startsWith('data:')) return false;
  return true;
}

/**
 * Determine where to redirect after login.
 * Honors a safe `returnTo` path if provided, otherwise falls back to role-based defaults.
 */
export function getPostLoginRedirect(
  user: UserLocal | null | undefined,
  returnTo?: string | null,
): string {
  if (returnTo != null && returnTo !== '' && isSafeRedirectPath(returnTo)) {
    return returnTo;
  }

  if (user?.role === 'admin') {
    return '/admin';
  }

  return '/settings';
}
