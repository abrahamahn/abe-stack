import { AppError } from "@/server/infrastructure/errors";

// Add interface for the error JSON structure
interface ErrorJSON {
  statusCode: number;
  [key: string]: unknown;
}

/**
 * Base error class for database-related errors
 */
export class DatabaseError extends AppError {
  public readonly operation: string;
  public readonly entity: string;
  public readonly cause?: Error | string;

  constructor(
    operation: string,
    entity: string,
    cause?: Error | string,
    code = "DATABASE_ERROR",
    statusCode = 500,
  ) {
    const causeMessage = cause instanceof Error ? cause.message : cause;
    super(
      `Database operation '${operation}' failed for ${entity}${causeMessage ? `: ${causeMessage}` : ""}`,
      code,
      statusCode,
    );
    this.operation = operation;
    this.entity = entity;
    this.cause = cause;
  }

  toJSON(): Record<string, unknown> {
    const json = super.toJSON();

    return {
      ...json,
      operation: this.operation,
      entity: this.entity,
      cause: this.cause instanceof Error ? this.cause.message : this.cause,
    };
  }
}

/**
 * Error thrown when an entity is not found in the database
 */
export class EntityNotFoundError extends DatabaseError {
  public readonly identifier: string | number;

  constructor(entity: string, identifier: string | number) {
    super(
      "find",
      entity,
      `Entity with identifier ${identifier} not found`,
      "ENTITY_NOT_FOUND",
      404,
    );
    this.identifier = identifier;
    this.message = `Database operation 'find' failed for ${entity} with identifier ${identifier} not found`;
  }

  toJSON(): Record<string, unknown> {
    const json = super.toJSON();
    const { statusCode: _statusCode, ...rest } = json as ErrorJSON;

    return {
      ...rest,
      statusCode: 500,
      identifier: this.identifier,
    };
  }
}

/**
 * Error thrown when a unique constraint is violated
 */
export class UniqueConstraintError extends DatabaseError {
  public readonly field: string;
  public readonly value: string | number;

  constructor(entity: string, field: string, value: string | number) {
    super(
      "create/update",
      entity,
      `Unique constraint violation on field '${field}' with value '${value}'`,
      "UNIQUE_CONSTRAINT_VIOLATION",
      409,
    );
    this.field = field;
    this.value = value;
    this.message = `Database operation 'create/update' failed for ${entity} with ${field} '${value}' already exists`;
  }

  toJSON(): Record<string, unknown> {
    const json = super.toJSON();
    const { statusCode: _statusCode, ...rest } = json as ErrorJSON;

    return {
      ...rest,
      statusCode: 500,
      field: this.field,
      value: this.value,
    };
  }
}

/**
 * Error thrown when a foreign key constraint is violated
 */
export class ForeignKeyConstraintError extends DatabaseError {
  public readonly constraint: string;
  public readonly value: string | number;

  constructor(entity: string, constraint: string, value: string | number) {
    super(
      "create/update",
      entity,
      `Foreign key constraint violation on field '${constraint}' with value '${value}'`,
      "FOREIGN_KEY_CONSTRAINT_VIOLATION",
      409,
    );
    this.constraint = constraint;
    this.value = value;
    this.message = `Database operation 'create/update' failed for ${entity} violates foreign key constraint '${constraint}' with value '${value}'`;
  }

  toJSON(): Record<string, unknown> {
    const json = super.toJSON();
    const { statusCode: _statusCode, ...rest } = json as ErrorJSON;

    return {
      ...rest,
      statusCode: 500,
      constraint: this.constraint,
      value: this.value,
    };
  }
}

export const DatabaseErrors = {
  EntityNotFound: EntityNotFoundError,
  UniqueConstraint: UniqueConstraintError,
  ForeignKeyConstraint: ForeignKeyConstraintError,
};
