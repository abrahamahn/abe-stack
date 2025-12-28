import { Request, Response, NextFunction } from "express";
import { Schema, ValidationErrorItem } from "joi";

/**
 * Middleware for validating request data against provided schema
 * @param schema Joi validation schema
 */
export const validateRequest = (schema: Schema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error } = schema.validate(req.body, {
      abortEarly: false, // Return all errors, not just the first one
      stripUnknown: true, // Remove unknown keys
      allowUnknown: false, // Don't allow unknown keys
    });

    if (error) {
      // Format validation errors
      const formattedErrors = error.details.map(
        (detail: ValidationErrorItem) => ({
          field: detail.path.join("."),
          message: detail.message,
        }),
      );

      res.status(400).json({
        success: false,
        message: "Validation error",
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
 */
export const validateQuery = (schema: Schema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true,
      allowUnknown: false,
    });

    if (error) {
      const formattedErrors = error.details.map(
        (detail: ValidationErrorItem) => ({
          field: detail.path.join("."),
          message: detail.message,
        }),
      );

      res.status(400).json({
        success: false,
        message: "Query parameter validation error",
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
 */
export const validateParams = (schema: Schema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error } = schema.validate(req.params, {
      abortEarly: false,
      stripUnknown: true,
      allowUnknown: false,
    });

    if (error) {
      const formattedErrors = error.details.map(
        (detail: ValidationErrorItem) => ({
          field: detail.path.join("."),
          message: detail.message,
        }),
      );

      res.status(400).json({
        success: false,
        message: "URL parameter validation error",
        errors: formattedErrors,
      });
      return;
    }

    next();
  };
};
