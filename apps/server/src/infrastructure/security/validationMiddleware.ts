import { Request, Response, NextFunction } from "express";
import { Schema, ValidationErrorItem } from "joi";

export interface ValidationOptions {
  abortEarly?: boolean;
  stripUnknown?: boolean;
  allowUnknown?: boolean;
  customErrorMessage?: string;
  errorStatusCode?: number;
  detailedErrors?: boolean;
}

const DEFAULT_VALIDATION_OPTIONS: ValidationOptions = {
  abortEarly: false, // Return all errors, not just the first one
  stripUnknown: true, // Remove unknown keys
  allowUnknown: false, // Don't allow unknown keys
  errorStatusCode: 400,
  detailedErrors: true,
};

/**
 * Format validation errors for consistent API responses
 */
function formatValidationErrors(
  errors: ValidationErrorItem[],
  detailedErrors: boolean = true
): Array<{
  field: string;
  message: string;
  type?: string;
  context?: Record<string, any>;
}> {
  return errors.map((detail: ValidationErrorItem) => {
    const formatted = {
      field: detail.path.join("."),
      message: detail.message,
    };

    // Add additional error context if detailed errors is enabled
    if (detailedErrors) {
      return {
        ...formatted,
        type: detail.type,
        context: detail.context as Record<string, any>,
      };
    }

    return formatted;
  });
}

/**
 * Middleware for validating request data against provided schema
 * @param schema Joi validation schema
 * @param options Validation options
 */
export const validateRequest = (
  schema: Schema,
  options: ValidationOptions = {}
) => {
  const mergedOptions = { ...DEFAULT_VALIDATION_OPTIONS, ...options };

  return (req: Request, res: Response, next: NextFunction): void => {
    const { error } = schema.validate(req.body, {
      abortEarly: mergedOptions.abortEarly,
      stripUnknown: mergedOptions.stripUnknown,
      allowUnknown: mergedOptions.allowUnknown,
    });

    if (error) {
      const formattedErrors = formatValidationErrors(
        error.details,
        mergedOptions.detailedErrors
      );

      res.status(mergedOptions.errorStatusCode || 400).json({
        success: false,
        message: mergedOptions.customErrorMessage || "Validation error",
        errors: formattedErrors,
      });
      return;
    }

    next();
  };
};

/**
 * Middleware for validating query parameters
 * @param schema Joi validation schema
 * @param options Validation options
 */
export const validateQuery = (
  schema: Schema,
  options: ValidationOptions = {}
) => {
  const mergedOptions = { ...DEFAULT_VALIDATION_OPTIONS, ...options };

  return (req: Request, res: Response, next: NextFunction): void => {
    const { error } = schema.validate(req.query, {
      abortEarly: mergedOptions.abortEarly,
      stripUnknown: mergedOptions.stripUnknown,
      allowUnknown: mergedOptions.allowUnknown,
    });

    if (error) {
      const formattedErrors = formatValidationErrors(
        error.details,
        mergedOptions.detailedErrors
      );

      res.status(mergedOptions.errorStatusCode || 400).json({
        success: false,
        message:
          mergedOptions.customErrorMessage ||
          "Query parameter validation error",
        errors: formattedErrors,
      });
      return;
    }

    next();
  };
};

/**
 * Middleware for validating URL parameters
 * @param schema Joi validation schema
 * @param options Validation options
 */
export const validateParams = (
  schema: Schema,
  options: ValidationOptions = {}
) => {
  const mergedOptions = { ...DEFAULT_VALIDATION_OPTIONS, ...options };

  return (req: Request, res: Response, next: NextFunction): void => {
    const { error } = schema.validate(req.params, {
      abortEarly: mergedOptions.abortEarly,
      stripUnknown: mergedOptions.stripUnknown,
      allowUnknown: mergedOptions.allowUnknown,
    });

    if (error) {
      const formattedErrors = formatValidationErrors(
        error.details,
        mergedOptions.detailedErrors
      );

      res.status(mergedOptions.errorStatusCode || 400).json({
        success: false,
        message:
          mergedOptions.customErrorMessage || "URL parameter validation error",
        errors: formattedErrors,
      });
      return;
    }

    next();
  };
};

/**
 * Middleware for validating request headers
 * @param schema Joi validation schema
 * @param options Validation options
 */
export const validateHeaders = (
  schema: Schema,
  options: ValidationOptions = {}
) => {
  const mergedOptions = { ...DEFAULT_VALIDATION_OPTIONS, ...options };

  return (req: Request, res: Response, next: NextFunction): void => {
    const { error } = schema.validate(req.headers, {
      abortEarly: mergedOptions.abortEarly,
      stripUnknown: mergedOptions.stripUnknown,
      allowUnknown: true, // Always allow unknown headers
    });

    if (error) {
      const formattedErrors = formatValidationErrors(
        error.details,
        mergedOptions.detailedErrors
      );

      res.status(mergedOptions.errorStatusCode || 400).json({
        success: false,
        message: mergedOptions.customErrorMessage || "Header validation error",
        errors: formattedErrors,
      });
      return;
    }

    next();
  };
};
