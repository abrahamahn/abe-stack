import * as fs from "fs";
import * as path from "path";

import dotenv from "dotenv";
import { injectable, inject, optional, unmanaged } from "inversify";

import { TYPES } from "@/server/infrastructure/di/types";

import { ConfigSchema, ValidatedConfig, validateConfig } from "./ConfigSchema";
import { SecretProvider } from "./secrets/SecretProvider";

import type { ILoggerService } from "../logging";
import type { IConfigService } from "./IConfigService";

/**
 * Server environment configuration
 */
export interface ServerEnvironment {
  nodeEnv: string;
  isProduction: boolean;
  isDevelopment: boolean;
  isTest: boolean;
  config: ServerConfig;
}

/**
 * Server configuration settings
 */
export interface ServerConfig {
  production: boolean;
  baseUrl: string;
  corsOrigin: string | string[];
  signatureSecret: Buffer;
  passwordSalt: string;
  port: number;
  host: string;
  uploadPath: string;
  tempPath: string;
  storagePath: string;
  storageUrl: string;
}

/**
 * Core configuration service that provides access to application configuration
 * with support for environment variables, .env files, and validation.
 */
@injectable()
export class ConfigService implements IConfigService {
  private values = new Map<string, string>();
  private namespaces = new Map<string, ConfigService>();
  private secretProviders: SecretProvider[] = [];
  private logger: ILoggerService;
  private namespace?: string;
  private parent?: ConfigService;
  private errors: string[] = [];
  private watchers = new Map<string, Set<(value: unknown) => void>>();

  /**
   * Creates a new ConfigService instance
   *
   * @param loggerService Optional logger service
   * @param parent Parent configuration service (for namespaced configs)
   * @param namespace Optional namespace for this configuration
   */
  constructor(
    @inject(TYPES.LoggerService) @optional() loggerService?: ILoggerService,
    @unmanaged() parent?: ConfigService,
    @unmanaged() namespace?: string
  ) {
    this.logger = loggerService?.createLogger("ConfigService") || {
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

    this.parent = parent;
    this.namespace = namespace;

    // Only load environment in the root instance
    if (!parent) {
      this.loadFromEnvironment();
      this.loadEnvFiles();
    }
  }

  /**
   * Initialize the configuration service
   */
  async initialize(): Promise<void> {
    if (this.parent) {
      return Promise.resolve();
    }

    // For root service, ensure environment is loaded
    this.loadEnvFiles();
    this.loadFromEnvironment();

    // Load domain-specific configurations
    this.loadDomainConfigs();

    this.logger.info("ConfigService initialized");

    return Promise.resolve();
  }

  /**
   * Loads configuration from environment variables
   */
  private loadFromEnvironment(): void {
    for (const [key, value] of Object.entries(process.env)) {
      if (value !== undefined) {
        this.set(key, value);
      }
    }
    this.logger.debug("Loaded configuration from environment variables");
  }

  /**
   * Loads configuration from .env files with priority
   */
  private loadEnvFiles(): void {
    const NODE_ENV = process.env.NODE_ENV || "development";
    const configDir = path.resolve(__dirname);
    const envDir = path.join(configDir, ".env");

    // Define environment files based on current environment
    let envFiles = [];

    // For each environment, use the appropriate environment file
    const envFile = path.join(envDir, `.env.${NODE_ENV}`);
    envFiles = [envFile];

    // Load files
    const loadedFiles = [];
    for (const file of envFiles) {
      if (fs.existsSync(file)) {
        this.loadFromFile(file);
        loadedFiles.push(path.basename(file));
      }
    }

    // If no files were loaded for test environment, try development as fallback
    if (loadedFiles.length === 0 && NODE_ENV === "test") {
      const fallbackFile = path.join(envDir, ".env.development");
      if (fs.existsSync(fallbackFile)) {
        this.loadFromFile(fallbackFile);
        loadedFiles.push(`${path.basename(fallbackFile)} (fallback)`);
        this.logger.warn(
          "Using development environment file as fallback for test environment"
        );
      }
    }

    if (loadedFiles.length > 0) {
      this.logger.info(`Loaded config from ${loadedFiles.join(", ")}`);
    } else {
      this.logger.debug("No environment files found");
    }
  }

  /**
   * Loads configuration from a file
   *
   * @param filePath Path to the configuration file
   */
  loadFromFile(filePath: string): void {
    try {
      if (!fs.existsSync(filePath)) {
        // For development environment files, provide a more informative message
        // since these are commonly missing in different environments
        const fileName = path.basename(filePath);
        if (fileName.startsWith(".env.")) {
          const env = fileName.replace(".env.", "");
          this.logger.debug(
            `Environment config file not found: ${fileName} (normal for non-${env} environments)`
          );
        } else {
          this.logger.warn(`Config file not found: ${filePath}`);
        }
        return;
      }

      const fullPath = path.resolve(filePath);
      const config = dotenv.parse(fs.readFileSync(fullPath));

      for (const [key, value] of Object.entries(config)) {
        this.set(key, value);
      }

      // Get relative path from src directory
      const relativePath = path.relative(
        path.join(process.cwd(), "src"),
        fullPath
      );
      this.logger.info(`Loaded config from ${relativePath}`);
    } catch (error) {
      // Check if it's a file not found error - NodeJS errors include a code property
      if (
        error instanceof Error &&
        "code" in error &&
        (error as NodeJS.ErrnoException).code === "ENOENT"
      ) {
        // File not found - provide clearer context
        const fileName = path.basename(filePath);
        this.logger.info(
          `Config file ${fileName} not present (this may be expected in certain environments)`
        );
      } else {
        // Other errors should still be logged as errors
        this.logger.error(
          `Failed to load config from ${filePath}: ${
            error instanceof Error
              ? `${error.name}: ${error.message}`
              : String(error)
          }`
        );
      }
    }
  }

  /**
   * Sets a configuration value.
   * If this is a namespaced config, it will delegate to the parent.
   */
  public set(key: string, value: string): void {
    // If we're in a namespace, we need to set the value in the parent
    if (this.parent && this.namespace) {
      this.parent.set(`${this.namespace}.${key}`, value);
      return;
    }

    // Set the value
    this.values.set(key, value);

    // Notify watchers if the value has changed or if it's a new value
    if (this.watchers && this.watchers.has(key)) {
      const callbacks = this.watchers.get(key);
      if (callbacks) {
        callbacks.forEach((callback) => {
          try {
            callback(value);
          } catch (error) {
            this.logger?.error(
              `Error in config watcher callback for ${key}: ${error instanceof Error ? error.message : String(error)}`
            );
          }
        });
      }
    }
  }

  /**
   * Gets a configuration value
   *
   * @param key Configuration key
   * @param defaultValue Optional default value
   * @returns The configuration value or undefined if not found
   */
  get<T>(key: string): T;
  get<T>(key: string, defaultValue: T): T;
  get<T>(key: string, defaultValue?: T): T {
    // If in a namespace, delegate to parent
    if (this.parent && this.namespace) {
      try {
        return this.parent.get<T>(
          `${this.namespace}_${key}`,
          defaultValue as T
        );
      } catch (error) {
        // If not found in parent, fall back to our own values
        if (error instanceof Error && error.message.includes("not found")) {
          // Continue to check our values
        } else {
          // Rethrow other errors
          throw error;
        }
      }
    }

    // Check if value exists in our values map
    if (this.values.has(key)) {
      return this.values.get(key) as unknown as T;
    }

    // Check for environment variables if allowed
    if (process.env[key] !== undefined && process.env[key] !== null) {
      return process.env[key] as unknown as T;
    }

    // Return default value or undefined if not found
    if (defaultValue !== undefined) {
      return defaultValue;
    }

    // For backward compatibility, return undefined cast as T
    return undefined as unknown as T;
  }

  /**
   * Gets a required configuration value
   *
   * @param key Configuration key
   * @returns The configuration value
   * @throws Error if the configuration value is not found
   */
  getRequired(key: string): string {
    const value = this.get<string>(key);
    if (value === undefined || value === null) {
      const fullKey = this.getNamespacedKey(key);
      const error = `Required configuration key not found: ${fullKey}`;
      this.logger.error(error);
      throw new Error(error);
    }
    return value;
  }

  /**
   * Gets a configuration value as a number
   *
   * @param key Configuration key
   * @param defaultValue Optional default value
   * @returns The configuration value as a number or default
   */
  getNumber(key: string, defaultValue: number = 0): number {
    try {
      const value = this.get<string | number>(key, defaultValue.toString());

      if (typeof value === "number") {
        return value;
      }

      const num = Number(value);
      return num; // Return NaN if the conversion fails
    } catch (_err) {
      return defaultValue;
    }
  }

  /**
   * Gets a configuration value as a boolean
   *
   * @param key Configuration key
   * @param defaultValue Optional default value
   * @returns The configuration value as a boolean or default
   */
  getBoolean(key: string, defaultValue: boolean = false): boolean {
    try {
      const value = this.get<string | boolean>(key, defaultValue.toString());

      if (typeof value === "boolean") {
        return value;
      }

      if (typeof value === "string") {
        const lower = value.toLowerCase();
        if (lower === "true" || lower === "yes" || lower === "1") {
          return true;
        }
        if (lower === "false" || lower === "no" || lower === "0") {
          return false;
        }
      }

      return defaultValue;
    } catch (_err) {
      return defaultValue;
    }
  }

  /**
   * Gets a configuration value as an array
   *
   * @param key Configuration key
   * @param defaultValue Optional default value
   * @param separator Separator character (default: comma)
   * @returns The configuration value as an array or default
   */
  getArray<T = string>(
    key: string,
    defaultValue: T[] = [] as unknown as T[]
  ): T[] {
    try {
      // Try to get the value
      const value = this.get<string | string[] | null | undefined>(key, null);

      // Return default if value is not available
      if (value === null || value === undefined) {
        return defaultValue;
      }

      // If the value is already an array, return it
      if (Array.isArray(value)) {
        return value as T[];
      }

      // If it's a string, try to parse it as JSON if it starts with [ and ends with ]
      if (typeof value === "string") {
        const trimmed = value.trim();
        if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
          try {
            const parsed = JSON.parse(trimmed);
            if (Array.isArray(parsed)) {
              return parsed as T[];
            }
          } catch (_err) {
            this.logger?.debug(`Failed to parse JSON array: ${value}`);
            // Fall through to split by separator
          }
        }

        // Split by separator (default to comma)
        const separator = ",";
        return value.split(separator).map((item: string) => {
          const trimmed = item.trim();
          // Convert values to appropriate types if possible
          if (/^[0-9]+$/.test(trimmed)) {
            return Number(trimmed) as unknown as T;
          } else if (trimmed.toLowerCase() === "true") {
            return true as unknown as T;
          } else if (trimmed.toLowerCase() === "false") {
            return false as unknown as T;
          }
          return trimmed as unknown as T;
        });
      }

      // For any other value, return as single-item array
      return [value as unknown as T];
    } catch (_err) {
      // Return default if there's any error accessing the value
      return defaultValue;
    }
  }

  /**
   * Gets a namespaced configuration service
   */
  public getNamespace(namespace: string): ConfigService {
    if (!namespace) {
      throw new Error("Namespace cannot be empty");
    }

    // Create namespace once and cache it
    if (!this.namespaces.has(namespace)) {
      const namespacedConfig = new ConfigService(this.logger);
      namespacedConfig.namespace = namespace;
      namespacedConfig.parent = this;

      // Load any environment variables with the namespace prefix into the namespaced config
      const prefix = `${namespace}_`;
      Object.entries(process.env).forEach(([key, value]) => {
        if (key.startsWith(prefix) && value !== undefined) {
          const unprefixedKey = key.substring(prefix.length);
          namespacedConfig.values.set(unprefixedKey, value);
        }
      });

      this.namespaces.set(namespace, namespacedConfig);
    }

    return this.namespaces.get(namespace)!;
  }

  /**
   * Gets all configuration values
   *
   * @returns All configuration values
   */
  getAll(): Record<string, string> {
    if (this.parent) {
      // If this is a namespaced config, filter values from parent
      const prefix = `${this.namespace}_`;
      const result: Record<string, string> = {};

      for (const [key, value] of this.parent.values.entries()) {
        if (key.startsWith(prefix)) {
          result[key.substring(prefix.length)] = value;
        }
      }

      return result;
    }

    // For root config, return all values
    const result: Record<string, string> = {};
    for (const [key, value] of this.values.entries()) {
      result[key] = value;
    }

    return result;
  }

  /**
   * Validates the current configuration against a schema
   */
  public validate(schema: ConfigSchema): ValidatedConfig {
    const config = this.toObject();
    const validationResult = validateConfig(
      config as Record<string, string>,
      schema
    );

    this.clearErrors();
    validationResult.errors.forEach((error) => {
      this.errors.push(error);
    });

    return validationResult;
  }

  /**
   * Ensures the configuration is valid, throws otherwise
   */
  public ensureValid(schema: ConfigSchema): void {
    const validationResult = this.validate(schema);

    if (!validationResult.valid) {
      const errorMessage = `Configuration validation failed: ${validationResult.errors.join(", ")}`;
      this.logger?.error(errorMessage);
      throw new Error(errorMessage);
    }
  }

  /**
   * Registers a secret provider
   *
   * @param provider Secret provider
   */
  registerSecretProvider(provider: SecretProvider): void {
    if (this.parent) {
      this.parent.registerSecretProvider(provider);
      return;
    }

    this.secretProviders.push(provider);
    this.logger.info("Registered secret provider");
  }

  /**
   * Gets a secret value
   *
   * @param key Secret key
   * @returns Secret value or undefined
   */
  async getSecret(key: string): Promise<string | undefined> {
    if (this.parent) {
      return this.parent.getSecret(key);
    }

    // First check if in environment
    const envValue = process.env[key];
    if (envValue !== undefined) {
      return envValue;
    }

    // Then check secret providers
    for (const provider of this.secretProviders) {
      try {
        // First check if the provider supports this secret
        let supportsKey = false;
        try {
          supportsKey = await provider.supportsSecret(key);
        } catch (supportError) {
          this.logger.error(
            `Error checking if provider supports secret ${key}: ${
              supportError instanceof Error
                ? supportError.message
                : String(supportError)
            }`
          );
          continue; // Skip this provider on error
        }

        if (supportsKey) {
          try {
            const value = await provider.getSecret(key);
            if (value !== undefined) {
              return value;
            }
          } catch (secretError) {
            this.logger.error(
              `Error getting secret ${key} from provider: ${
                secretError instanceof Error
                  ? secretError.message
                  : String(secretError)
              }`
            );
          }
        }
      } catch (error) {
        this.logger.error(
          `Unexpected error with secret provider: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    }

    return undefined;
  }

  /**
   * Checks if the application is running in development mode
   *
   * @returns True if in development mode
   */
  isDevelopment(): boolean {
    return (process.env.NODE_ENV || "development") === "development";
  }

  /**
   * Checks if the application is running in production mode
   *
   * @returns True if in production mode
   */
  isProduction(): boolean {
    return process.env.NODE_ENV === "production";
  }

  /**
   * Checks if the application is running in test mode
   *
   * @returns True if in test mode
   */
  isTest(): boolean {
    return process.env.NODE_ENV === "test";
  }

  /**
   * Gets the full key with namespace prefix
   *
   * @param key Configuration key
   * @returns Namespaced key
   */
  private getNamespacedKey(key: string): string {
    return this.namespace ? `${this.namespace}_${key}` : key;
  }

  public getString(key: string, defaultValue: string = ""): string {
    try {
      const value = this.get(key, defaultValue);

      // Return empty string if null or undefined
      if (value === null || value === undefined) {
        return defaultValue;
      }

      // Convert to string if not already
      return String(value);
    } catch (_err) {
      return defaultValue;
    }
  }

  getObject<T>(key: string, defaultValue?: T): T {
    try {
      const value = this.get<string>(key);
      return value ? JSON.parse(value) : (defaultValue as T);
    } catch {
      return defaultValue as T;
    }
  }

  getErrors(): string[] {
    return [...this.errors];
  }

  clearErrors(): void {
    this.errors = [];
  }

  hasErrors(): boolean {
    return this.errors.length > 0;
  }

  getConfig(): Record<string, unknown> {
    return this.toObject();
  }

  /**
   * Sets multiple configuration values at once
   */
  public setMultiple(entries: Record<string, unknown>): void {
    // Validate input
    if (!entries || typeof entries !== "object") {
      throw new Error("Entries must be a valid object");
    }

    // First, clear out all previous values
    this.values.clear();

    // Set each entry individually
    for (const [key, value] of Object.entries(entries)) {
      this.set(key, String(value));
    }
  }

  delete(key: string): void {
    this.values.delete(key);
  }

  deleteMultiple(keys: string[]): void {
    keys.forEach((key) => this.delete(key));
  }

  clear(): void {
    this.values.clear();
  }

  /**
   * Checks if a configuration key exists
   *
   * @param key Configuration key
   * @returns True if the key exists
   */
  has(key: string): boolean {
    if (this.parent) {
      return this.parent.has(this.getNamespacedKey(key));
    }
    return this.values.has(key);
  }

  getKeys(): string[] {
    return Array.from(this.values.keys());
  }

  getValues(): unknown[] {
    return Array.from(this.values.values());
  }

  getEntries(): [string, unknown][] {
    return Array.from(this.values.entries());
  }

  getSize(): number {
    return this.values.size;
  }

  isEmpty(): boolean {
    return this.values.size === 0;
  }

  /**
   * Convert configuration to a plain object
   * without inheriting from process.env
   */
  public toObject(): Record<string, unknown> {
    // Create a new object with only the explicitly set values, not process.env
    const result: Record<string, unknown> = {};

    // Copy over values explicitly set in this instance
    // In test mode, we ONLY want our explicitly set values, not process.env
    this.values.forEach((value, key) => {
      result[key] = value;
    });

    // Copy namespaced configurations (if any)
    this.namespaces.forEach((namespace, key) => {
      const nsValues = namespace.toObject();
      Object.entries(nsValues).forEach(([nsKey, nsValue]) => {
        result[`${key}.${nsKey}`] = nsValue;
      });
    });

    return result;
  }

  /**
   * Converts to JSON string
   */
  public toJSON(): string {
    // Only include explicitly set values
    const values = this.toObject();
    return JSON.stringify(values);
  }

  /**
   * Resets the configuration
   */
  reset(): void {
    // Clear all existing values
    this.values.clear();
    this.namespaces.clear();
  }

  reload(): Promise<void> {
    return this.initialize();
  }

  /**
   * Watches for changes to a configuration value.
   * Returns a function that can be called to stop watching.
   */
  public watch(key: string, callback: (value: unknown) => void): () => void {
    if (!this.watchers) {
      this.watchers = new Map();
    }

    if (!this.watchers.has(key)) {
      this.watchers.set(key, new Set());
    }

    const callbacks = this.watchers.get(key)!;
    callbacks.add(callback);

    // Call the callback immediately with the current value (if it exists)
    if (this.has(key)) {
      // If we have a value, trigger the callback with the current value
      const currentValue = this.get(key);
      callback(currentValue);
    }

    return () => this.unwatch(key, callback);
  }

  unwatch(key: string, callback: (value: unknown) => void): void {
    if (this.watchers.has(key)) {
      const callbacks = this.watchers.get(key)!;
      callbacks.delete(callback);

      // Clean up the watcher list if empty
      if (callbacks.size === 0) {
        this.watchers.delete(key);
      }
    }
  }

  unwatchAll(): void {
    if (this.watchers) {
      this.watchers.clear();
    }
  }

  /**
   * Gets a configuration value with a default fallback
   *
   * @param key Configuration key
   * @param defaultValue Default value to use if key is not found
   * @returns The configuration value or the default value
   */
  getWithDefault<T>(key: string, defaultValue: T): T {
    const value = this.get<T>(key);
    return value !== undefined ? value : defaultValue;
  }

  /**
   * Merge configuration with another object
   *
   * @param other Object to merge with
   */
  merge(other: Record<string, unknown>): void {
    Object.entries(other).forEach(([key, value]) => {
      this.set(key, String(value));
    });
  }

  /**
   * Get differences between current config and another object
   *
   * @param other Object to compare with
   * @returns Object containing the differences
   */
  diff(other: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    const current = this.getAll();
    Object.keys(other).forEach((key) => {
      if (current[key] !== other[key]) {
        result[key] = other[key];
      }
    });
    return result;
  }

  /**
   * Check if config equals another object
   *
   * @param other Object to compare with
   * @returns True if objects are equal
   */
  equals(other: Record<string, unknown>): boolean {
    const current = this.getAll();
    return Object.keys(other).every((key) => current[key] === other[key]);
  }

  /**
   * Convert to string representation
   */
  toString(): string {
    return JSON.stringify(this.toObject());
  }

  /**
   * Load config from JSON string
   *
   * @param json JSON string to load
   */
  fromJSON(json: string): void {
    const data = JSON.parse(json);
    this.fromObject(data);
  }

  /**
   * Load config from object
   *
   * @param obj Object to load
   */
  fromObject(obj: Record<string, unknown>): void {
    // Clear first to remove any existing values
    this.clear();
    this.setMultiple(obj);
  }

  /**
   * Clone the current configuration state into a new object
   * Creates a new ConfigService instance with only our explicitly set values
   */
  public clone(): Record<string, unknown> {
    // Create a new ConfigService instance for cloning
    const cloned = new ConfigService();

    // Get the explicitly set values
    const result: Record<string, unknown> = {};

    // Only copy values that were explicitly set in this instance
    this.values.forEach((value, key) => {
      result[key] = value;
      cloned.set(key, String(value));
    });

    return result;
  }

  /**
   * Load all domain-specific configurations
   * This ensures that all configuration providers have access to the latest configs
   */
  private loadDomainConfigs(): void {
    try {
      // Nothing to do here directly
      // Domain-specific configuration providers will be instantiated by DI
      // and will access this config service
      this.logger.debug(
        "Domain-specific configs will be loaded on demand via providers"
      );
    } catch (error) {
      this.logger.error(
        `Error loading domain configs: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }
}
