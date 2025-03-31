import { injectable, inject, optional } from "inversify";

import { TYPES } from "@/server/infrastructure/di/types";

import { SecretProvider } from "./SecretProvider";

import type { ILoggerService } from "../../logging";

/**
 * Environment variable-based secret provider
 *
 * This provider retrieves secrets from environment variables,
 * optionally with a prefix to distinguish them from regular config values.
 */
@injectable()
export class EnvSecretProvider implements SecretProvider {
  private logger: ILoggerService;

  /**
   * Creates a new EnvSecretProvider instance
   *
   * @param prefix Optional prefix for secret environment variables
   * @param loggerService Optional logger service
   */
  constructor(
    private prefix: string = "",
    @inject(TYPES.LoggerService) @optional() loggerService?: ILoggerService,
  ) {
    this.logger = loggerService?.createLogger("EnvSecretProvider") || {
      debug: console.debug,
      info: console.info,
      warn: console.warn,
      error: console.error,
      // Minimal implementation for other required methods
      createLogger: () => this.logger,
      withContext: () => this.logger,
      debugObj: () => {},
      infoObj: () => {},
      warnObj: () => {},
      errorObj: () => {},
      addTransport: () => {},
      setTransports: () => {},
      setMinLevel: () => {},
      initialize: async () => {},
      shutdown: async () => {},
    };
  }

  /**
   * Checks if this provider supports a specific secret
   *
   * @param key Secret key
   * @returns True if the provider supports the secret
   */
  async supportsSecret(key: string): Promise<boolean> {
    const envKey = this.getEnvKey(key);
    return envKey in process.env;
  }

  /**
   * Gets a secret value
   *
   * @param key Secret key
   * @returns Secret value or undefined if not found
   */
  async getSecret(key: string): Promise<string | undefined> {
    const envKey = this.getEnvKey(key);
    const value = process.env[envKey];

    if (value !== undefined) {
      this.logger.debug(`Retrieved secret from environment: ${envKey}`);
    }

    return value;
  }

  /**
   * Gets the environment variable key for a secret
   *
   * @param key Secret key
   * @returns Environment variable key
   */
  private getEnvKey(key: string): string {
    return this.prefix ? `${this.prefix}_${key}` : key;
  }
}
