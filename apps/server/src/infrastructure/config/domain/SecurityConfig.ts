import { injectable, inject } from "inversify";

import { ConfigService, ConfigSchema } from "@/server/infrastructure/config";
import { TYPES } from "@/server/infrastructure/di/types";

/**
 * Security configuration interface
 */
export interface SecurityConfig {
  jwtSecret: string;
  jwtRefreshSecret: string;
  signatureSecret: Buffer;
  passwordSalt: Buffer;
}

/**
 * Security configuration provider
 */
@injectable()
export class SecurityConfigProvider {
  private config: SecurityConfig;

  constructor(
    @inject(TYPES.ConfigService) private configService: ConfigService,
  ) {
    this.config = this.loadConfig();

    // Validate configuration
    this.configService.ensureValid(this.getConfigSchema());
  }

  /**
   * Gets the security configuration
   *
   * @returns Security configuration
   */
  getConfig(): SecurityConfig {
    return this.config;
  }

  /**
   * Gets the configuration schema for validation
   *
   * @returns Configuration schema
   */
  getConfigSchema(): ConfigSchema {
    return {
      properties: {
        JWT_SECRET: {
          type: "string",
          required: true,
          secret: true,
          description: "Secret key for JWT signing",
        },
        JWT_EXPIRES_IN: {
          type: "string",
          default: "1d",
          description: "JWT token expiration time",
        },
        JWT_REFRESH_EXPIRES_IN: {
          type: "string",
          default: "7d",
          description: "JWT refresh token expiration time",
        },
        PASSWORD_SALT_ROUNDS: {
          type: "number",
          default: 10,
          min: 1,
          max: 20,
          description: "Number of salt rounds for password hashing",
        },
        RATE_LIMIT_WINDOW: {
          type: "number",
          default: 15,
          min: 1,
          description: "Rate limit window in minutes",
        },
        RATE_LIMIT_MAX_REQUESTS: {
          type: "number",
          default: 100,
          min: 1,
          description: "Maximum number of requests per window",
        },
        CORS_ORIGIN: {
          type: "string",
          default: "*",
          description: "CORS allowed origin",
        },
        CORS_METHODS: {
          type: "string",
          default: "GET,POST,PUT,DELETE,OPTIONS",
          description: "CORS allowed methods",
        },
        CORS_HEADERS: {
          type: "string",
          default: "Content-Type,Authorization",
          description: "CORS allowed headers",
        },
        CORS_CREDENTIALS: {
          type: "boolean",
          default: true,
          description: "Whether to allow credentials in CORS",
        },
      },
    };
  }

  /**
   * Loads the security configuration from the config service
   *
   * @returns Security configuration
   */
  private loadConfig(): SecurityConfig {
    return {
      jwtSecret: this.configService.getRequired("JWT_SECRET"),
      jwtRefreshSecret: this.configService.getRequired("JWT_REFRESH_SECRET"),
      signatureSecret: Buffer.from(
        this.configService.getRequired("SIGNATURE_SECRET"),
        "utf8",
      ),
      passwordSalt: Buffer.from(
        this.configService.getRequired("PASSWORD_SALT"),
        "utf8",
      ),
    };
  }
}
