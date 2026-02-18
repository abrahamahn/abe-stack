// main/shared/src/core/tenant/domain.restrictions.ts

/**
 * @file Domain Restriction Logic
 * @description Validates email addresses against a workspace's allowed domain list.
 * @module Core/Tenant
 */

// ============================================================================
// Functions
// ============================================================================

/**
 * Extract the domain from an email address.
 * Returns lowercase domain or empty string if invalid.
 */
export function extractEmailDomain(email: string): string {
  const atIndex = email.lastIndexOf('@');
  if (atIndex === -1) return '';
  return email.slice(atIndex + 1).toLowerCase();
}

/**
 * Check if an email address is allowed by the workspace's domain restrictions.
 *
 * @param email - The email address to check
 * @param allowedDomains - Array of allowed domains (empty = all allowed)
 * @returns true if the email domain is allowed
 */
export function isEmailDomainAllowed(email: string, allowedDomains: string[]): boolean {
  // Empty allowlist means all domains are permitted
  if (allowedDomains.length === 0) return true;

  const domain = extractEmailDomain(email);
  if (domain === '') return false;

  // Normalize all allowed domains to lowercase for comparison
  return allowedDomains.some((allowed) => allowed.toLowerCase() === domain);
}
