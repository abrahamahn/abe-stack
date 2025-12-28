/**
 * Core authentication feature
 */

// Export types
export * from "./types";

// Export models
export * from "./models/user.model";

// Public API
export async function login(
  _email: string,
  _password: string,
  _options?: any
): Promise<any> {
  // This is a stub - implementation will be added later
  throw new Error("Not implemented");
}

export async function register(_userData: any): Promise<any> {
  // This is a stub - implementation will be added later
  throw new Error("Not implemented");
}

export async function logout(_token: string): Promise<boolean> {
  // This is a stub - implementation will be added later
  throw new Error("Not implemented");
}
