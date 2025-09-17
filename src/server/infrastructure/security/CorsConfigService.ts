/**
 * CORS Configuration Service
 *
 * This service provides CORS configuration with proper error handling, logging,
 * and dependency injection.
 */

import { injectable, inject } from "inversify";

import type { IConfigService } from "@/server/infrastructure/config";
import { TYPES } from "@/server/infrastructure/di/types";
import type { ILoggerService } from "@/server/infrastructure/logging";

import { CorsOptions } from "../security/corsConfig";


/**
 * CORS configuration service
 */
@injectable()
export class CorsConfigService {
  constructor(
    @inject(TYPES.ConfigService) private configService: IConfigService,
    @inject(TYPES.SecurityLogger) private logger: ILoggerService
  ) {
    this.logger.debug("CorsConfigService initialized");
  }

  /**
   * Get CORS configuration for the application
   * @returns CORS configuration options
   */
  getCorsConfiguration(): CorsOptions {
    try {
      // Get configuration from service
      const corsOrigin = this.configService.get("cors.origin");
      const corsMaxAge = Number(this.configService.get("cors.maxAge")) || 86400;
      const allowCredentials = this.parseBooleanConfig(
        "cors.allowCredentials",
        true
      );

      // Build CORS options
      const corsOptions: CorsOptions = {
        origin: this.parseOrigin(corsOrigin),
        methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE", "OPTIONS"],
        allowedHeaders: [
          "Content-Type",
          "Authorization",
          "X-Requested-With",
          "X-CSRF-Token",
          "X-Auth-Token",
          "Accept",
          "Origin",
        ],
        exposedHeaders: [
          "Content-Disposition",
          "X-Pagination-Total-Count",
          "X-Pagination-Page-Count",
          "X-Pagination-Current-Page",
          "X-Pagination-Per-Page",
        ],
        credentials: allowCredentials,
        maxAge: corsMaxAge,
        preflightContinue: false,
        optionsSuccessStatus: 204,
      };

      this.logger.debug("Generated CORS configuration", {
        origin: corsOrigin,
        credentials: corsOptions.credentials,
      });

      return corsOptions;
    } catch (error) {
      this.logger.error("Error generating CORS configuration", { error });

      // Provide a reasonable default configuration
      return this.getDefaultCorsConfig();
    }
  }

  /**
   * Parse the origin configuration value
   * @param originConfig Origin configuration value
   * @returns Parsed origin value for CORS
   */
  private parseOrigin(
    originConfig: any
  ):
    | string
    | string[]
    | RegExp
    | boolean
    | ((
        origin: string | undefined,
        callback: (err: Error | null, allow?: boolean) => void
      ) => void)
    | undefined {
    // Handle undefined or null
    if (originConfig === undefined || originConfig === null) {
      return "*"; // Default to wildcard
    }

    // Handle boolean configuration
    if (typeof originConfig === "boolean") {
      return originConfig; // Keep as is (false disables CORS)
    }

    // Handle string configuration - comma or space separated list
    if (typeof originConfig === "string") {
      // Trim the string
      const trimmedOrigin = originConfig.trim();

      // Check if it's empty
      if (trimmedOrigin.length === 0) {
        return "*"; // Default to wildcard if empty
      }

      // Check if it's the wildcard
      if (trimmedOrigin === "*") {
        return "*";
      }

      // Split by comma or space
      const origins = trimmedOrigin
        .split(/[,\s]+/)
        .map((o) => o.trim())
        .filter((o) => o.length > 0);

      if (origins.length === 0) {
        return "*"; // Default to wildcard if empty
      }

      if (origins.length === 1) {
        return origins[0]; // Return single origin
      }

      return origins; // Return array of origins
    }

    // Handle array configuration
    if (Array.isArray(originConfig)) {
      return originConfig.length > 0 ? originConfig : "*";
    }

    // Handle regular expression
    if (originConfig instanceof RegExp) {
      return originConfig;
    }

    // Handle function
    if (typeof originConfig === "function") {
      return originConfig;
    }

    // Default to wildcard for any other type
    return "*";
  }

  /**
   * Parse boolean configuration value
   * @param key Configuration key
   * @param defaultValue Default value
   * @returns Parsed boolean value
   */
  private parseBooleanConfig(key: string, defaultValue: boolean): boolean {
    const value = this.configService.get(key);

    if (value === undefined || value === null) {
      return defaultValue;
    }

    if (typeof value === "boolean") {
      return value;
    }

    if (typeof value === "string") {
      const lowerValue = value.toLowerCase();
      return (
        lowerValue === "true" || lowerValue === "yes" || lowerValue === "1"
      );
    }

    if (typeof value === "number") {
      return value === 1;
    }

    return defaultValue;
  }

  /**
   * Get default CORS configuration (fallback for errors)
   * @returns Default CORS configuration
   */
  private getDefaultCorsConfig(): CorsOptions {
    this.logger.warn("Using default CORS configuration");

    return {
      origin: process.env.NODE_ENV === "production" ? false : "*",
      methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
      credentials: false,
      maxAge: 86400,
      preflightContinue: false,
      optionsSuccessStatus: 204,
    };
  }
}
