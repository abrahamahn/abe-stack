/**
 * Base interface for secret providers
 *
 * Secret providers are responsible for retrieving sensitive configuration values
 * from external sources such as environment variables, key vaults, or files.
 */
export interface SecretProvider {
  /**
   * Initializes the secret provider
   *
   * This method is called before any secrets are retrieved, and should
   * perform any necessary setup, like loading secrets from a file or
   * connecting to a key vault.
   *
   * @returns A promise that resolves when initialization is complete
   */
  initialize?(): Promise<void>;

  /**
   * Checks if this provider supports a specific secret
   *
   * @param key Secret key
   * @returns True if the provider supports the secret
   */
  supportsSecret(key: string): Promise<boolean>;

  /**
   * Gets a secret value
   *
   * @param key Secret key
   * @returns Secret value or undefined if not found
   */
  getSecret(key: string): Promise<string | undefined>;
}
