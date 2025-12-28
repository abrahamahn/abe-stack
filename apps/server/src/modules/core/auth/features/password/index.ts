/**
 * Password management feature
 */

// Export models
export * from "./models/password-reset-token.model";

// Public API
export async function forgotPassword(email: string): Promise<boolean> {
  // This is a stub - implementation will be added later
  throw new Error("Not implemented");
}

export async function resetPassword(
  token: string,
  newPassword: string
): Promise<boolean> {
  // This is a stub - implementation will be added later
  throw new Error("Not implemented");
}

export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<boolean> {
  // This is a stub - implementation will be added later
  throw new Error("Not implemented");
}
