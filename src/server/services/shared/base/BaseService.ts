import { DatabaseConnectionManager } from "@database/config";
import { Logger } from "@services/dev/logger/LoggerService";
import {
  ValidationFailedError,
  ValidationError,
  ValidationRule,
} from "@services/shared";

/**
 * Base service class that provides common functionality for all services
 * Services are responsible for:
 * 1. Implementing business logic
 * 2. Orchestrating operations across multiple repositories
 * 3. Handling validation and error checking
 * 4. Managing transactions when needed
 */
export abstract class BaseService {
  protected logger: Logger;

  constructor(serviceName: string) {
    this.logger = new Logger(serviceName);
  }

  /**
   * Execute operations within a transaction
   * @param operation Function containing the operations to execute in transaction
   * @returns Result of the operation
   */
  protected async withTransaction<T>(operation: () => Promise<T>): Promise<T> {
    return DatabaseConnectionManager.withTransaction(operation);
  }

  /**
   * Validate data against rules and throw if validation fails
   * @param data Data to validate
   * @param validationRules Rules to validate against
   * @throws ValidationFailedError if validation fails
   */
  protected validateAndThrow(
    data: unknown,
    validationRules: ValidationRule[],
  ): void {
    const errors = this.validate(data, validationRules);
    if (errors.length > 0) {
      throw new ValidationFailedError(errors);
    }
  }

  /**
   * Validate data against rules
   * @param data Data to validate
   * @param validationRules Rules to validate against
   * @returns Array of validation errors
   */
  protected validate(
    data: unknown,
    validationRules: ValidationRule[],
  ): ValidationError[] {
    const errors: ValidationError[] = [];

    for (const rule of validationRules) {
      for (const validator of rule.rules) {
        const error = validator(data);
        if (error) {
          errors.push({
            field: rule.field,
            message: error,
          });
        }
      }
    }

    return errors;
  }

  protected async withCache<T>(
    _key: string,
    operation: () => Promise<T>,
    _ttl: number,
  ): Promise<T> {
    try {
      return operation();
    } catch (error) {
      this.logger.error("Cache operation failed:", error);
      throw error;
    }
  }
}
