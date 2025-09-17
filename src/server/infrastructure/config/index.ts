// Core configuration
export type { IConfigService } from "./IConfigService";
export { ConfigService } from "./ConfigService";
export type {
  ConfigSchema,
  ConfigSchemaField,
  ValidatedConfig,
} from "./ConfigSchema";
export { ConfigValidationError } from "@/server/infrastructure/errors/infrastructure/ConfigValidationError";

// Environment utilities
export { isDevelopment, isProduction, isTest } from "./environments";

// Secret management
export type { SecretProvider } from "./secrets/SecretProvider";
export { FileSecretProvider } from "./secrets/FileSecretProvider";
export { EnvSecretProvider } from "./secrets/EnvSecretProvider";
export { InMemorySecretProvider } from "./secrets/InMemorySecretProvider";

// Domain-specific configuration
export type {
  DatabaseConfig,
  DatabaseConfigProvider,
} from "./domain/DatabaseConfig";
export type { ServerConfig, ServerConfigProvider } from "./domain/ServerConfig";
export type { StorageConfig } from "./domain/StorageConfig";
export { StorageConfigProvider } from "./domain/StorageConfig";
export type {
  SecurityConfig,
  SecurityConfigProvider,
} from "./domain/SecurityConfig";
export type { EmailConfig, EmailConfigProvider } from "./domain/EmailConfig";
export type { LoggingOptions, LoggingConfig } from "./domain/LoggingConfig";
export { LoggingConfigService } from "./domain/LoggingConfig";
