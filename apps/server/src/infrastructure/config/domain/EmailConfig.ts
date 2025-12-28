import { injectable, inject } from "inversify";

import { ConfigService, ConfigSchema } from "@/server/infrastructure/config";
import { TYPES } from "@/server/infrastructure/di/types";

/**
 * Email configuration interface
 */
export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  from: string;
}

/**
 * Email configuration provider
 */
@injectable()
export class EmailConfigProvider {
  private config: EmailConfig;

  constructor(
    @inject(TYPES.ConfigService) private configService: ConfigService,
  ) {
    this.config = this.loadConfig();

    // Validate configuration
    this.configService.ensureValid(this.getConfigSchema());
  }

  /**
   * Gets the email configuration
   *
   * @returns Email configuration
   */
  getConfig(): EmailConfig {
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
        EMAIL_HOST: {
          type: "string",
          default: "smtp.example.com",
          description: "SMTP server host",
        },
        EMAIL_PORT: {
          type: "number",
          default: 465,
          min: 1,
          max: 65535,
          description: "SMTP server port",
        },
        EMAIL_USER: {
          type: "string",
          default: "user@example.com",
          description: "SMTP server username",
        },
        EMAIL_PASSWORD: {
          type: "string",
          default: "password123",
          secret: true,
          description: "SMTP server password",
        },
        EMAIL_FROM: {
          type: "string",
          default: "noreply@example.com",
          description: "Default sender email address",
        },
        EMAIL_SECURE: {
          type: "boolean",
          default: true,
          description: "Use secure connection (TLS)",
        },
      },
    };
  }

  /**
   * Loads the email configuration from the config service
   *
   * @returns Email configuration
   */
  private loadConfig(): EmailConfig {
    try {
      return {
        host: this.configService.getString("EMAIL_HOST", "smtp.example.com"),
        port: this.configService.getNumber("EMAIL_PORT", 465),
        secure: this.configService.getBoolean("EMAIL_SECURE", true),
        auth: {
          user: this.configService.getString("EMAIL_USER", "user@example.com"),
          pass: this.configService.getString("EMAIL_PASSWORD", "password123"),
        },
        from: this.configService.getString("EMAIL_FROM", "noreply@example.com"),
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error
          ? `Failed to load email configuration: ${error.message}`
          : "Failed to load email configuration";
      throw new Error(errorMessage);
    }
  }
}
