import { NextFunction, Request, Response } from "express";
import { inject, injectable } from "inversify";

import { ConfigService } from "../../../../infrastructure/config/ConfigService";
import { TYPES } from "../../../../infrastructure/di/types";
import { generateCorrelationId } from "../../../../infrastructure/errors/utils";
import {
  IGeoService,
  GeoIpData,
  GeoLookupResult,
} from "../interfaces/geo-service.interface";

// TODO: Update these import paths based on the actual project structure
// These may need to be adjusted to match where these modules actually exist
import type { ILoggerService } from "../../../../infrastructure/logging";

/**
 * Request with geolocation information
 */
export interface GeoAwareRequest extends Request {
  geo?: GeoIpData | null;
  geoFailed?: boolean;
}

/**
 * Options for the geolocation middleware
 */
export interface GeoMiddlewareOptions {
  /**
   * Whether to attach the geo data to the request object
   */
  attachToRequest?: boolean;

  /**
   * Headers to check for IP address (in order of preference)
   */
  ipHeaders?: string[];

  /**
   * Whether to skip cache and force a fresh lookup
   */
  skipCache?: boolean;

  /**
   * Cache time-to-live in seconds (0 = don't cache)
   */
  cacheTtl?: number;

  /**
   * Request timeout in milliseconds
   */
  timeout?: number;

  /**
   * Whether to require user consent before lookup (GDPR compliance)
   */
  requireConsent?: boolean;

  /**
   * Cookie name for user consent
   */
  consentCookie?: string;

  /**
   * Query parameter name for user consent
   */
  consentParam?: string;

  /**
   * Whether to block the request if geolocation fails
   */
  blockOnFailure?: boolean;

  /**
   * List of IP addresses to ignore (e.g., localhost, private IPs)
   */
  ignoreIps?: string[];

  /**
   * Custom function to extract IP address from request
   */
  ipExtractor?: (req: Request) => string;

  /**
   * Custom error handler function
   */
  errorHandler?: (req: Request, res: Response, error: Error) => void;

  /**
   * Additional options to pass to the geo service
   */
  serviceOptions?: Record<string, any>;

  /**
   * Whether to enable caching
   */
  enableCache?: boolean;
}

/**
 * Default options for the geo middleware
 */
const DEFAULT_OPTIONS: GeoMiddlewareOptions = {
  attachToRequest: true,
  ipHeaders: [
    "x-forwarded-for",
    "x-real-ip",
    "cf-connecting-ip",
    "true-client-ip",
  ],
  skipCache: false,
  cacheTtl: 24 * 60 * 60, // 24 hours
  timeout: 1000, // 1 second (low to avoid slowing down requests)
  requireConsent: true,
  consentCookie: "geo_consent",
  consentParam: "geo_consent",
  blockOnFailure: false,
  ignoreIps: ["127.0.0.1", "::1", "localhost"],
  enableCache: true,
  serviceOptions: {},
};

/**
 * Extend Express Request to include geo data
 */
declare module "express" {
  interface Request {
    geo?: GeoIpData | null;
    geoFailed?: boolean;
  }
}

/**
 * Extract IP address from request headers
 */
function extractIpAddress(req: Request, ipHeaders: string[]): string | null {
  // First check headers
  for (const header of ipHeaders) {
    const value = req.headers[header.toLowerCase()] as string;
    if (value) {
      // Handle comma-separated IPs (e.g. X-Forwarded-For: client, proxy1, proxy2)
      const ips = value.split(",").map((ip) => ip.trim());
      if (ips.length > 0 && ips[0]) {
        return ips[0];
      }
    }
  }

  // Fall back to remoteAddress from the request connection
  const remoteAddress = req.socket.remoteAddress;
  if (remoteAddress) {
    // Handle IPv6 format (e.g. ::ffff:192.168.0.1)
    if (remoteAddress.includes("::ffff:")) {
      return remoteAddress.split("::ffff:")[1];
    }
    return remoteAddress;
  }

  return null;
}

/**
 * Check if the user has given consent for geolocation
 */
function getUserConsent(req: Request, options: GeoMiddlewareOptions): boolean {
  // Check query parameter
  if (options.consentParam && req.query[options.consentParam] === "true") {
    return true;
  }

  // Check cookie
  if (
    options.consentCookie &&
    req.cookies &&
    req.cookies[options.consentCookie] === "true"
  ) {
    return true;
  }

  // Default to false if consent is required, true otherwise
  return !options.requireConsent;
}

/**
 * Functional middleware for simple use cases
 */
export function geoMiddleware(
  geoService: IGeoService,
  options: GeoMiddlewareOptions = {}
) {
  // Merge options with defaults
  const opts = { ...DEFAULT_OPTIONS, ...options };

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Extract IP address from request
      const ip = opts.ipExtractor
        ? opts.ipExtractor(req)
        : extractIpAddress(req, opts.ipHeaders || []);

      if (!ip) {
        // No IP address found, skip geo lookup
        return next();
      }

      // Skip lookup for ignored IPs
      if (opts.ignoreIps && opts.ignoreIps.includes(ip)) {
        req.geo = null;
        return next();
      }

      // Check for a special test IP for development/testing
      if (ip === "127.0.0.1" || ip === "::1") {
        // For local development, can use a mock location
        if (opts.attachToRequest) {
          req.geo = {
            ip,
            country: "United States",
            countryCode: "US",
            city: "San Francisco",
            region: "California",
            location: {
              latitude: 37.7749,
              longitude: -122.4194,
            },
            timezone: "America/Los_Angeles",
          };
        }
        return next();
      }

      // Check for user consent if required
      const hasConsent = getUserConsent(req, opts);

      if (opts.requireConsent && !hasConsent) {
        console.debug("Skipping geolocation due to missing user consent");
        req.geo = null;
        return next();
      }

      // Perform the lookup
      const result = await geoService.lookupIp(ip, {
        ...opts.serviceOptions,
        skipCache: opts.skipCache,
        cacheTtl: opts.cacheTtl,
        timeout: opts.timeout,
        userConsent: hasConsent,
      });

      if (result.success && result.data && opts.attachToRequest) {
        // Attach geo data to request object
        req.geo = result.data;
      } else if (!result.success) {
        req.geoFailed = true;

        if (opts.blockOnFailure) {
          return res.status(503).json({
            error: "Geolocation service unavailable",
          });
        }
      }

      next();
    } catch (error) {
      req.geoFailed = true;

      // Handle errors
      if (opts.errorHandler && error instanceof Error) {
        opts.errorHandler(req, res, error);
      } else {
        // If no custom error handler, just log and continue
        console.error("Geo middleware error:", error);

        if (opts.blockOnFailure) {
          return res.status(503).json({
            error: "Geolocation service error",
          });
        }

        next();
      }
    }
  };
}

/**
 * Injectable Geolocation middleware class for dependency injection
 * Adds location information to request objects
 */
@injectable()
export class GeoMiddleware {
  private readonly logger: ILoggerService;
  private readonly defaultOptions: GeoMiddlewareOptions;

  constructor(
    @inject(TYPES.LoggerService) loggerService: ILoggerService,
    @inject(TYPES.ConfigService) private configService: ConfigService,
    @inject(TYPES.GeoService) private geoService: IGeoService
  ) {
    this.logger = loggerService.createLogger("GeoMiddleware");

    // Start with the default options
    this.defaultOptions = { ...DEFAULT_OPTIONS };

    // Override default options from config
    const requireConsentValue = this.configService.getBoolean(
      "GEO_REQUIRE_CONSENT"
    );
    if (requireConsentValue !== undefined) {
      this.defaultOptions.requireConsent = requireConsentValue;
    }

    const cacheTtlValue = this.configService.getNumber("GEO_CACHE_TTL");
    if (cacheTtlValue !== undefined) {
      this.defaultOptions.cacheTtl = cacheTtlValue;
    }

    const timeoutValue = this.configService.getNumber("GEO_MIDDLEWARE_TIMEOUT");
    if (timeoutValue !== undefined) {
      this.defaultOptions.timeout = timeoutValue;
    }
  }

  /**
   * Create the middleware function
   */
  create(
    options: GeoMiddlewareOptions = {}
  ): (req: GeoAwareRequest, res: Response, next: NextFunction) => void {
    // Merge provided options with defaults
    const opts: GeoMiddlewareOptions = {
      ...this.defaultOptions,
      ...options,
    };

    // Return the middleware function
    return async (req: GeoAwareRequest, res: Response, next: NextFunction) => {
      const correlationId = generateCorrelationId();

      try {
        // Extract IP address
        const ip = opts.ipExtractor
          ? opts.ipExtractor(req)
          : extractIpAddress(req, opts.ipHeaders || []);

        if (!ip) {
          // No IP address found, skip geo lookup
          return next();
        }

        // Skip lookup for ignored IPs
        if (opts.ignoreIps && opts.ignoreIps.includes(ip)) {
          req.geo = null;
          return next();
        }

        // Check for a special test IP for development/testing
        if (ip === "127.0.0.1" || ip === "::1") {
          // For local development, can use a mock location
          if (opts.attachToRequest) {
            req.geo = {
              ip,
              country: "United States",
              countryCode: "US",
              city: "San Francisco",
              region: "California",
              location: {
                latitude: 37.7749,
                longitude: -122.4194,
              },
              timezone: "America/Los_Angeles",
            };
          }
          return next();
        }

        // Check for user consent if required
        const hasConsent = getUserConsent(req, opts);

        if (opts.requireConsent && !hasConsent) {
          this.logger.debug(
            "Skipping geolocation due to missing user consent",
            {
              ip,
              correlationId,
            }
          );
          req.geo = null;
          return next();
        }

        // Perform IP geolocation lookup
        const result = await this.geoService.lookupIp(ip, {
          ...opts.serviceOptions,
          skipCache: opts.skipCache || !opts.enableCache,
          cacheTtl: opts.cacheTtl,
          timeout: opts.timeout,
          userConsent: hasConsent,
        });

        if (result.success && result.data && opts.attachToRequest) {
          req.geo = result.data;
        } else if (!result.success) {
          req.geoFailed = true;

          if (opts.blockOnFailure) {
            return res.status(503).json({
              error: "Geolocation service unavailable",
            });
          }
        }

        next();
      } catch (error) {
        this.logger.error("Error in geolocation middleware", {
          error,
          correlationId,
          path: req.path,
        });

        req.geoFailed = true;

        if (opts.errorHandler && error instanceof Error) {
          opts.errorHandler(req, res, error);
        } else if (opts.blockOnFailure) {
          return res.status(503).json({
            error: "Geolocation service error",
          });
        } else {
          next();
        }
      }
    };
  }
}
