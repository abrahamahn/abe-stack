import { injectable } from "inversify";

import { SecretProvider } from "./SecretProvider";

/**
 * In-memory secret provider for testing and development
 */
@injectable()
export class InMemorySecretProvider implements SecretProvider {
  private secrets: Map<string, string> = new Map();

  /**
   * Creates a new InMemorySecretProvider instance
   *
   * @param initialSecrets Optional initial secrets
   */
  constructor(initialSecrets?: Record<string, string>) {
    if (initialSecrets) {
      for (const [key, value] of Object.entries(initialSecrets)) {
        this.secrets.set(key, value);
      }
    }
  }

  /**
   * Sets a secret value
   *
   * @param key Secret key
   * @param value Secret value
   */
  setSecret(key: string, value: string): void {
    this.secrets.set(key, value);
  }

  /**
   * Checks if this provider supports a specific secret
   *
   * @param key Secret key
   * @returns True if the provider supports the secret
   */
  async supportsSecret(key: string): Promise<boolean> {
    return this.secrets.has(key);
  }

  /**
   * Gets a secret value
   *
   * @param key Secret key
   * @returns Secret value or undefined if not found
   */
  async getSecret(key: string): Promise<string | undefined> {
    return this.secrets.get(key);
  }

  /**
   * Clears all secrets
   */
  clear(): void {
    this.secrets.clear();
  }

  /**
   * Gets all secrets
   *
   * @returns All secrets
   */
  getAllSecrets(): Record<string, string> {
    const result: Record<string, string> = {};
    for (const [key, value] of this.secrets.entries()) {
      result[key] = value;
    }
    return result;
  }
}
