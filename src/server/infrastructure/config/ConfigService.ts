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
    @unmanaged() namespace?: string,
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
    const envFiles = [
      path.join(envDir, `.env.${NODE_ENV}.local`), // highest priority
      path.join(envDir, `.env.${NODE_ENV}`),
      path.join(envDir, ".env.local"),
      path.join(envDir, ".env"), // lowest priority
    ];

    // Load files in reverse order (lowest priority first)
    const loadedFiles = [];
    for (const file of envFiles.reverse()) {
      if (fs.existsSync(file)) {
        this.loadFromFile(file);
        loadedFiles.push(path.basename(file));
      }
    }

    if (loadedFiles.length > 0) {
      this.logger.info(`Loaded environment files: ${loadedFiles.join(", ")}`);
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
        this.logger.warn(`Config file not found: ${filePath}`);
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
        fullPath,
      );
      this.logger.info(`Loaded config from ${relativePath}`);
    } catch (error) {
      this.logger.error(
        `Failed to load config from ${filePath}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  /**
   * Sets a configuration value
   *
   * @param key Configuration key
   * @param value Configuration value
   */
  set(key: string, value: string): void {
    if (this.parent) {
      // If this is a namespaced config, delegate to parent
      this.parent.set(this.getNamespacedKey(key), value);
      return;
    }

    this.values.set(key, value);
  }

  /**
   * Gets a configuration value
   *
   * @param key Configuration key
   * @param defaultValue Optional default value if key is not found
   * @returns The configuration value
   */
  get<T>(key: string, defaultValue?: T): T {
    if (this.parent) {
      return this.parent.get(this.getNamespacedKey(key), defaultValue);
    }

    const value = this.values.get(key);
    if (value === undefined) {
      return defaultValue as T;
    }
    return value as T;
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
  getNumber(key: string, defaultValue?: number): number {
    const value = this.get<string>(key);
    if (value === undefined || value === null || value === "") {
      return defaultValue ?? 0;
    }
    const num = Number(value);
    if (isNaN(num)) {
      return defaultValue ?? NaN;
    }
    return num;
  }

  /**
   * Gets a configuration value as a boolean
   *
   * @param key Configuration key
   * @param defaultValue Optional default value
   * @returns The configuration value as a boolean or default
   */
  getBoolean(key: string, defaultValue: boolean = false): boolean {
    const value = this.get<string>(key);
    if (value === undefined) {
      return defaultValue;
    }
    const lowered = value.toLowerCase();
    if (
      lowered === "true" ||
      value === "1" ||
      lowered === "yes" ||
      lowered === "y"
    ) {
      return true;
    }
    if (
      lowered === "false" ||
      value === "0" ||
      lowered === "no" ||
      lowered === "n"
    ) {
      return false;
    }
    return defaultValue;
  }

  /**
   * Gets a configuration value as an array
   *
   * @param key Configuration key
   * @param defaultValue Optional default value
   * @param separator Separator character (default: comma)
   * @returns The configuration value as an array or default
   */
  getArray<T>(
    key: string,
    defaultValue: T[] = [] as T[],
    separator = ",",
  ): T[] {
    const value = this.get<string>(key);
    if (!value) {
      return defaultValue;
    }

    return value
      .split(separator)
      .map((item: string) => item.trim())
      .filter(Boolean)
      .map((item) => item as T);
  }

  /**
   * Gets a namespaced configuration service
   *
   * @param namespace Namespace name
   * @returns A namespaced configuration service
   */
  getNamespace(namespace: string): ConfigService {
    if (!this.namespaces.has(namespace)) {
      // Create a new namespaced config and initialize it with existing values
      const namespacedConfig = new ConfigService(this.logger, this, namespace);
      this.namespaces.set(namespace, namespacedConfig);

      // Copy any existing namespaced values
      const prefix = `${namespace}_`;
      for (const [key, value] of this.values.entries()) {
        if (key.startsWith(prefix)) {
          namespacedConfig.set(key.substring(prefix.length), value);
        }
      }

      // Also copy any environment variables with the namespace prefix
      for (const [key, value] of Object.entries(process.env)) {
        if (key.startsWith(prefix) && value !== undefined) {
          namespacedConfig.set(key.substring(prefix.length), value);
        }
      }
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
   * Validates the configuration against a schema
   *
   * @param schema Schema to validate against
   * @returns Whether the configuration is valid
   */
  validate(schema: ConfigSchema): ValidatedConfig {
    this.errors = [];
    const config = this.getAll();
    if (!config || typeof config !== "object") {
      return {
        valid: false,
        errors: ["Configuration is not a valid object"],
        values: {},
      };
    }
    const result = validateConfig(config, schema);
    this.errors = result.errors;
    return result;
  }

  /**
   * Check if validation succeeded and throw an error if not
   *
   * @param schema Schema to validate against
   * @throws ConfigValidationError if validation failed
   */
  public ensureValid(schema: ConfigSchema): void {
    const result = this.validate(schema);
    if (!result.valid) {
      throw new Error(`Invalid configuration:\n${result.errors.join("\n")}`);
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
            }`,
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
              }`,
            );
          }
        }
      } catch (error) {
        this.logger.error(
          `Unexpected error with secret provider: ${
            error instanceof Error ? error.message : String(error)
          }`,
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

  getString(key: string, defaultValue?: string): string {
    try {
      return this.get<string>(key);
    } catch {
      return defaultValue || "";
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
    // Implement error clearing if needed
  }

  hasErrors(): boolean {
    return false; // Implement error checking if needed
  }

  getConfig(): Record<string, unknown> {
    return this.getAll();
  }

  setMultiple(entries: Record<string, unknown>): void {
    Object.entries(entries).forEach(([key, value]) => {
      this.set(key, String(value));
    });
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

  clone(): Record<string, unknown> {
    return { ...this.getAll() };
  }

  merge(other: Record<string, unknown>): void {
    Object.entries(other).forEach(([key, value]) => {
      this.set(key, String(value));
    });
  }

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

  equals(other: Record<string, unknown>): boolean {
    const current = this.getAll();
    return Object.keys(other).every((key) => current[key] === other[key]);
  }

  toString(): string {
    return JSON.stringify(this.getAll());
  }

  toJSON(): string {
    return this.toString();
  }

  fromJSON(json: string): void {
    const data = JSON.parse(json);
    this.fromObject(data);
  }

  fromObject(obj: Record<string, unknown>): void {
    this.clear();
    this.setMultiple(obj);
  }

  reset(): void {
    this.clear();
    this.loadFromEnvironment();
    this.loadEnvFiles();
  }

  reload(): Promise<void> {
    return this.initialize();
  }

  watch(key: string, callback: (value: unknown) => void): () => void {
    // Store initial value
    const initialValue = this.get(key);
    callback(initialValue);

    // Return cleanup function
    return () => {
      // Cleanup if needed
    };
  }

  unwatch(key: string, callback: (value: unknown) => void): void {
    // Get current value before unwatching
    const currentValue = this.get(key);
    callback(currentValue);
  }

  unwatchAll(): void {
    // Implement unwatchAll if needed
  }

  getWithDefault<T>(key: string, defaultValue: T): T {
    try {
      return this.get<T>(key);
    } catch {
      return defaultValue;
    }
  }

  toObject(): Record<string, unknown> {
    return this.getAll();
  }
}
