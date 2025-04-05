import { Request, Response } from "express";
import { inject, injectable } from "inversify";

import { TYPES } from "@/server/infrastructure/di/types";

import { AppError } from "./AppError";
import { IErrorHandler } from "./IErrorHandler";
import { NetworkError } from "./infrastructure/InfrastructureError";
import { ServiceError } from "./ServiceError";
import { InitializationError } from "./TechnicalError";

import type { ILoggerService } from "../logging";

/**
 * Middleware for handling errors in API requests
 */
@injectable()
export class ErrorHandler implements IErrorHandler {
  constructor(
    @inject(TYPES.LoggerService) private readonly logger: ILoggerService,
  ) {}

  /**
   * Express error handler middleware
   */
  handleError = (error: Error, req: Request, res: Response): Response => {
    // Default error response
    const errorResponse = {
      success: false,
      error: {
        message: "Internal server error",
        code: "INTERNAL_ERROR",
      },
    };

    // Get request information for logging
    const requestInfo = {
      method: req?.method || "[unknown]",
      path: req?.path || req?.url || "[unknown]",
      ip: req?.ip || req?.socket?.remoteAddress || "[unknown]",
      userAgent: req?.get ? req.get("User-Agent") : "[unknown]",
    };

    // Handle ServiceError instances
    if (error instanceof ServiceError) {
      // Log the error with appropriate level based on status code
      if (error.statusCode && error.statusCode >= 500) {
        this.logger.error(`API Error: ${error.message}`, {
          error: error.toJSON(),
          request: requestInfo,
        });
      } else {
        this.logger.warn(`API Error: ${error.message}`, {
          error: error.toJSON(),
          request: requestInfo,
        });
      }

      // Set status code from error or default to 500
      const statusCode = error.statusCode || 500;

      // Customize error response based on ServiceError properties
      errorResponse.error = {
        message: error.message,
        code: error.code,
        ...error.metadata,
      };

      return res.status(statusCode).json(errorResponse);
    }

    // Handle NetworkError instances
    if (error instanceof NetworkError) {
      this.logger.error(`Network Error: ${error.message}`, {
        error,
        request: requestInfo,
      });

      errorResponse.error = {
        message: error.message,
        code: "NETWORK_ERROR",
      };

      return res.status(500).json(errorResponse);
    }

    // Handle InitializationError instances
    if (error instanceof InitializationError) {
      this.logger.error(`Initialization Error: ${error.message}`, {
        error,
        request: requestInfo,
      });

      // Type assertion to allow component property
      errorResponse.error = {
        message: error.message,
        code: "INITIALIZATION_ERROR",
        component: error.component,
      } as typeof errorResponse.error & { component: string };

      return res.status(500).json(errorResponse);
    }

    // Handle AppError instances
    if (error instanceof AppError) {
      this.logger.error(`App Error: ${error.message}`, {
        error: error.toJSON(),
        request: requestInfo,
      });

      const statusCode = error.statusCode || 500;

      errorResponse.error = {
        message: error.message,
        code: error.code,
      };

      return res.status(statusCode).json(errorResponse);
    }

    // Handle standard errors
    this.logger.error(`Unhandled error: ${error.message}`, {
      error: {
        message: error.message,
        name: error.name,
        stack: error.stack?.split("\n").slice(0, 5).join("\n"), // Include only first 5 lines of stack
      },
      request: requestInfo,
    });

    // For security, don't expose internal error details in production
    if (process.env.NODE_ENV === "production") {
      return res.status(500).json(errorResponse);
    }

    // In development, include more details but keep the error code consistent
    return res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: error.message,
        stack: error.stack,
      },
    });
  };
}
