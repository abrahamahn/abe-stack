// src/apps/web/src/features/auth/utils/redirects.ts

interface UserLocal {
  role?: string;
}

/**
 * Validate that a redirect path is safe (prevents open-redirect attacks).
 * Only allows relative paths starting with a single slash.
 */
function isSafeRedirectPath(path: string): boolean {
  // Decode first, then validate the decoded result
  let decoded: string;
  try {
    decoded = decodeURIComponent(path);
  } catch {
    return false;
  }

  // Remove ASCII control chars that could bypass scheme checks
  let cleaned = '';
  for (let i = 0; i < decoded.length; i++) {
    const code = decoded.charCodeAt(i);
    if (code > 0x1f && code !== 0x7f) {
      const char = decoded[i];
      if (char !== undefined) {
        cleaned += char;
      }
    }
  }

  // Must be a relative path starting with exactly one slash
  if (!cleaned.startsWith('/')) return false;
  if (cleaned.startsWith('//')) return false;

  // Block dangerous URI schemes anywhere in the path
  const lower = cleaned.toLowerCase();
  if (lower.includes('javascript:') || lower.includes('data:') || lower.includes('vbscript:')) {
    return false;
  }

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
