import * as fs from "fs";
import * as path from "path";

import { injectable, inject, optional } from "inversify";

import { TYPES } from "@/server/infrastructure/di/types";

import { SecretProvider } from "./SecretProvider";

import type { ILoggerService } from "../../logging";

/**
 * File-based secret provider that reads secrets from a JSON file
 */
@injectable()
export class FileSecretProvider implements SecretProvider {
  protected secrets: Record<string, string> = {};
  protected loaded = false;
  protected logger: ILoggerService;

  /**
   * Creates a new FileSecretProvider instance
   *
   * @param secretsFilePath Path to the secrets file
   * @param loggerService Optional logger service
   */
  constructor(
    private secretsFilePath: string,
    @inject(TYPES.LoggerService) @optional() loggerService?: ILoggerService,
  ) {
    this.logger = loggerService?.createLogger("FileSecretProvider") || {
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
   * Initializes the provider by loading secrets from file
   */
  async initialize(): Promise<void> {
    if (this.loaded) {
      return;
    }

    try {
      // Check both absolute path and relative to current working directory
      const filePath = path.isAbsolute(this.secretsFilePath)
        ? this.secretsFilePath
        : path.resolve(process.cwd(), this.secretsFilePath);

      if (!fs.existsSync(filePath)) {
        this.logger.warn(`Secrets file not found: ${filePath}`);
        return;
      }

      const content = fs.readFileSync(filePath, "utf8");
      try {
        this.secrets = JSON.parse(content);
        this.loaded = true;
        this.logger.info(`Loaded secrets from: ${filePath}`);
      } catch (parseError) {
        this.logger.error(
          `Failed to parse secrets file ${filePath}: ${
            parseError instanceof Error
              ? parseError.message
              : String(parseError)
          }`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to load secrets: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Checks if this provider supports a specific secret
   *
   * @param key Secret key
   * @returns True if the provider supports the secret
   */
  async supportsSecret(key: string): Promise<boolean> {
    if (!this.loaded) {
      await this.initialize();
    }
    return key in this.secrets;
  }

  /**
   * Gets a secret value
   *
   * @param key Secret key
   * @returns Secret value or undefined if not found
   */
  async getSecret(key: string): Promise<string | undefined> {
    if (!this.loaded) {
      await this.initialize();
    }
    return this.secrets[key];
  }
}
