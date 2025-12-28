import { Request, Response, NextFunction } from "express";

import { ServerEnvironment } from "@infrastructure/config/ConfigService";

/**
 * Options for CORS with authentication
 */
export interface CorsWithAuthOptions {
  additionalHeaders?: string[];
  additionalMethods?: string[];
  preflightSuccessHandler?: (req: Request, res: Response) => void;
}

/**
 * CORS options interface
 */
export interface CorsOptions {
  origin?:
    | boolean
    | string
    | RegExp
    | (string | RegExp)[]
    | ((
        origin: string | undefined,
        callback: (err: Error | null, allow?: boolean) => void
      ) => void);
  methods?: string | string[];
  allowedHeaders?: string | string[];
  exposedHeaders?: string | string[];
  credentials?: boolean;
  maxAge?: number;
  preflightContinue?: boolean;
  optionsSuccessStatus?: number;
  preflightSuccessHandler?: (req: Request, res: Response) => void;
}

/**
 * Validate if an origin is allowed based on the configuration
 */
export function validateOrigin(
  env: ServerEnvironment,
  origin: string | undefined
): boolean {
  if (!origin) {
    return false;
  }

  const { corsOrigin } = env.config;

  // Allow all origins in development if specified with '*'
  if (corsOrigin === "*") {
    return true;
  }

  // Parse allowed origins from configuration
  const allowedOrigins =
    typeof corsOrigin === "string"
      ? corsOrigin.split(",").map((o: string) => o.trim())
      : corsOrigin;

  // Extract domain from origin
  let originDomain = origin;
  try {
    const url = new URL(origin);
    originDomain = url.hostname;
  } catch (error) {
    // If it's not a valid URL, use the raw origin
  }

  // Check if the domain or full origin is in the allowed list
  return (
    allowedOrigins.includes(originDomain) ||
    allowedOrigins.includes(origin) ||
    allowedOrigins.some((allowedOrigin: string) => {
      // Support wildcard subdomains
      if (allowedOrigin.startsWith("*.")) {
        const baseDomain = allowedOrigin.substring(2);
        return (
          originDomain.endsWith(`.${baseDomain}`) || originDomain === baseDomain
        );
      }
      return false;
    })
  );
}

/**
 * Create CORS options with authentication support
 */
export function corsWithAuthOptions(
  env: ServerEnvironment,
  options: CorsWithAuthOptions = {}
): CorsOptions {
  const defaultHeaders = [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "Accept",
  ];

  const defaultMethods = ["GET", "POST", "OPTIONS"];

  // Combine default and additional headers/methods
  const allowedHeaders = [
    ...defaultHeaders,
    ...(options.additionalHeaders || []),
  ];

  const allowedMethods = [
    ...defaultMethods,
    ...(options.additionalMethods || []),
  ];

  return {
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void
    ) => {
      if (validateOrigin(env, origin)) {
        callback(null, true);
      } else {
        callback(new Error("Origin not allowed by CORS"));
      }
    },
    methods: allowedMethods,
    allowedHeaders,
    credentials: true, // Allow cookies to be sent with requests
    maxAge: 86400, // Cache preflight request for 24 hours
    preflightContinue: false,
    optionsSuccessStatus: 204,
    preflightSuccessHandler: options.preflightSuccessHandler,
  };
}

/**
 * Create a CORS middleware that validates origin and handles preflight requests
 */
export function createCorsMiddleware(env: ServerEnvironment) {
  return (req: Request, res: Response, next: NextFunction) => {
    const origin = req.headers.origin;

    // Check if origin is allowed
    if (!validateOrigin(env, origin)) {
      return res.status(403).json({
        error: "CORS error",
        message: "This origin is not allowed to access this resource",
      });
    }

    // Set CORS headers
    res.setHeader("Access-Control-Allow-Origin", origin!);
    res.setHeader("Access-Control-Allow-Credentials", "true");

    // Handle preflight requests
    if (req.method === "OPTIONS") {
      // This is a preflight request
      const requestMethod = req.headers["access-control-request-method"];
      if (requestMethod) {
        res.setHeader(
          "Access-Control-Allow-Methods",
          "GET, POST, OPTIONS, PUT, PATCH, DELETE"
        );
      }

      const requestHeaders = req.headers["access-control-request-headers"];
      if (requestHeaders) {
        res.setHeader("Access-Control-Allow-Headers", requestHeaders);
      }

      res.setHeader("Access-Control-Max-Age", "86400"); // 24 hours
      res.end();
      return;
    }

    // Continue processing the request
    next();
  };
}

/**
 * Handle preflight requests with authentication requirements
 */
export function preflightRequestHandler(env: ServerEnvironment) {
  return (req: Request, res: Response, next: NextFunction) => {
    const origin = req.headers.origin;

    // Handle preflight CORS requests
    if (req.method === "OPTIONS") {
      // Check if origin is allowed
      if (!validateOrigin(env, origin)) {
        return res.status(403).json({
          error: "CORS error",
          message: "This origin is not allowed to access this resource",
        });
      }

      // Set CORS headers
      res.setHeader("Access-Control-Allow-Origin", origin!);
      res.setHeader("Access-Control-Allow-Credentials", "true");

      // Set allowed methods
      const requestMethod = req.headers["access-control-request-method"];
      if (requestMethod) {
        res.setHeader(
          "Access-Control-Allow-Methods",
          "GET, POST, OPTIONS, PUT, PATCH, DELETE"
        );
      }

      // Set allowed headers
      const requestHeaders = req.headers["access-control-request-headers"];
      if (requestHeaders) {
        res.setHeader("Access-Control-Allow-Headers", requestHeaders);
      }

      // Set max age for preflight requests
      res.setHeader("Access-Control-Max-Age", "86400"); // 24 hours

      // End the request without calling next middleware
      res.end();
      return;
    }

    // Not a preflight request, continue
    next();
  };
}
