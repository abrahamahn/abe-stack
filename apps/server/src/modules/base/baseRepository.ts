import { IDatabaseServer } from "@infrastructure/database";
import { ILoggerService } from "@infrastructure/logging";
import { BaseModelInterface } from "@modules/base";
import {
  DbClient,
  DbQueryResultRow,
} from "@/server/infrastructure/database/IDatabaseServer";

/**
 * Error thrown when an entity is not found
 */
export class EntityNotFoundError extends Error {
  constructor(entityName: string, identifier: string | number) {
    super(`${entityName} with ID ${identifier} not found`);
    this.name = "EntityNotFoundError";
  }
}

/**
 * Error thrown when a database operation fails
 */
export class DatabaseError extends Error {
  constructor(operation: string, entityName: string, cause: string) {
    super(`Database ${operation} error for ${entityName}: ${cause}`);
    this.name = "DatabaseError";
  }
}

/**
 * Error thrown when a unique constraint is violated
 */
export class UniqueConstraintError extends Error {
  constructor(entityName: string, constraint: string, value: string | number) {
    super(
      `Unique constraint "${constraint}" violated for ${entityName} with value ${value}`
    );
    this.name = "UniqueConstraintError";
  }
}

/**
 * Error thrown when a foreign key constraint is violated
 */
export class ForeignKeyConstraintError extends Error {
  constructor(entityName: string, constraint: string, value: string | number) {
    super(
      `Foreign key constraint "${constraint}" violated for ${entityName} with value ${value}`
    );
    this.name = "ForeignKeyConstraintError";
  }
}

/**
 * Error thrown when validation fails
 */
export class ValidationError extends Error {
  details: ValidationErrorDetail[];

  constructor(details: ValidationErrorDetail[]) {
    super(`Validation failed: ${details.map((d) => d.message).join(", ")}`);
    this.name = "ValidationError";
    this.details = details;
  }
}

/**
 * Detail about a validation error
 */
export interface ValidationErrorDetail {
  field: string;
  message: string;
  code?: string;
}

/**
 * Base repository class that provides common database operations.
 * Repositories are responsible for:
 * 1. Handling all database operations (CRUD)
 * 2. Managing database connections and transactions
 * 3. Converting between database and model formats
 * 4. NOT implementing business logic (that's the model's job)
 *
 * @template T The type of model this repository handles
 */
export abstract class BaseRepository<T extends BaseModelInterface> {
  /**
   * The database table name for this repository
   */
  protected abstract tableName: string;

  /**
   * The columns available in the database table
   */
  protected abstract columns: string[];

  /**
   * Entity name for this repository
   */
  protected entityName: string;

  constructor(
    protected logger: ILoggerService,
    protected databaseService: IDatabaseServer,
    entityName?: string
  ) {
    this.entityName =
      entityName || this.constructor.name.replace("Repository", "");
  }

  /**
   * Helper method for executing operations within a transaction
   * @param callback Function to execute within the transaction
   * @returns Result of the callback function
   */
  protected async withTransaction<R>(
    callback: (client: DbClient) => Promise<R>
  ): Promise<R> {
    return this.databaseService.withTransaction(callback);
  }

  /**
   * Validate data before database operations
   * Override this method in child repositories to add specific validation rules
   * @param data The data to validate
   * @param isUpdate Whether this is for an update operation (partial data allowed)
   * @returns Validation errors if any
   */
  protected validateData(
    data: Partial<T>,
    isUpdate: boolean = false
  ): ValidationErrorDetail[] {
    const errors: ValidationErrorDetail[] = [];

    // Basic validation that can be overridden in child repositories
    if (!isUpdate) {
      // Check required fields only for create operations
      const requiredFields = this.getRequiredFields();
      const missingFields = requiredFields.filter((field) => !(field in data));

      if (missingFields.length > 0) {
        missingFields.forEach((field) => {
          errors.push({
            field,
            message: "Field is required",
            code: "REQUIRED_FIELD",
          });
        });
      }
    }

    return errors;
  }

  /**
   * Get required fields for this entity
   * Override this method in child repositories to specify required fields
   */
  protected getRequiredFields(): string[] {
    return [];
  }

  /**
   * Validate data and throw an error if validation fails
   * @param data The data to validate
   * @param isUpdate Whether this is for an update operation
   * @throws ValidationError if validation fails
   */
  protected validateAndThrow(
    data: Partial<T>,
    isUpdate: boolean = false
  ): void {
    const errors = this.validateData(data, isUpdate);
    if (errors.length > 0) {
      throw new ValidationError(errors);
    }
  }

  /**
   * Execute a raw SQL query with proper error handling
   * @param sql SQL query string with placeholders
   * @param params Parameters for the query
   * @param client Optional database client for transactions
   * @returns Query result
   */
  protected async executeQuery<R extends DbQueryResultRow>(
    sql: string,
    params: unknown[] = [],
    client?: DbClient
  ): Promise<{ rows: R[]; rowCount: number }> {
    try {
      const result = client
        ? await client.query<R>(sql, params)
        : await this.databaseService.query<R>(sql, params);

      return {
        rows: result.rows,
        rowCount: result.rowCount ?? 0,
      };
    } catch (error) {
      this.logger.error("Error executing query", {
        operation: "executeQuery",
        entity: this.entityName,
        sql: sql.replace(/\s+/g, " ").trim(),
        params: params.map((p) =>
          typeof p === "string" && p.includes("password") ? "[REDACTED]" : p
        ),
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });

      // Handle specific database errors
      if (error instanceof Error) {
        if (error.message.includes("unique constraint")) {
          const match = error.message.match(/unique constraint "(.+?)"/);
          const constraint = match ? match[1] : "unknown";
          throw new UniqueConstraintError(
            this.entityName,
            constraint,
            String(params[0])
          );
        }

        if (error.message.includes("violates foreign key constraint")) {
          const match = error.message.match(
            /violates foreign key constraint "(.+?)"/
          );
          const constraint = match ? match[1] : "unknown";
          throw new ForeignKeyConstraintError(
            this.entityName,
            constraint,
            String(params[0])
          );
        }
      }

      // Fallback to generic database error
      throw new DatabaseError("execute query", this.entityName, String(error));
    }
  }

  /**
   * Find a record by ID
   */
  async findById(id: string): Promise<T | null> {
    const query = `
      SELECT ${this.columns.join(", ")}
      FROM ${this.tableName}
      WHERE id = $1
      LIMIT 1
    `;

    const result = await this.executeQuery<Record<string, unknown>>(query, [
      id,
    ]);

    if (result.rows.length === 0) {
      this.logger.debug(`${this.entityName} with id ${id} not found`);
      return null;
    }

    return this.mapResultToModel(result.rows[0]);
  }

  /**
   * Find entity by ID or throw a not found error
   */
  async findByIdOrThrow(id: string): Promise<T> {
    const entity = await this.findById(id);
    if (!entity) {
      throw new EntityNotFoundError(this.entityName, id);
    }
    return entity;
  }

  /**
   * Create a new record
   */
  async create(data: Partial<T>): Promise<T> {
    try {
      this.validateAndThrow(data);

      // Convert camelCase keys to snake_case if needed
      const preparedData = this.prepareDataForDatabase(data);

      const columns = Object.keys(preparedData);
      const placeholders = columns.map((_, index) => `$${index + 1}`);
      const values = Object.values(preparedData);

      const query = `
        INSERT INTO ${this.tableName} (${columns.join(", ")})
        VALUES (${placeholders.join(", ")})
        RETURNING ${this.columns.join(", ")}
      `;

      this.logger.info("Creating record:", {
        table: this.tableName,
        data: Object.entries(preparedData).reduce(
          (acc, [key, value]) => {
            acc[key] = key.includes("password") ? "[REDACTED]" : value;
            return acc;
          },
          {} as Record<string, unknown>
        ),
      });

      const result = await this.executeQuery<Record<string, unknown>>(
        query,
        values
      );
      return this.mapResultToModel(result.rows[0]);
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new DatabaseError("create", this.entityName, String(error));
    }
  }

  /**
   * Update a record
   */
  async update(id: string, data: Partial<T>): Promise<T | null> {
    try {
      const existing = await this.findById(id);
      if (!existing) {
        throw new EntityNotFoundError(this.entityName, id);
      }
      this.validateAndThrow(data, true);

      // Convert camelCase keys to snake_case if needed
      const preparedData = this.prepareDataForDatabase(data);

      const columns = Object.keys(preparedData);
      const setClause = columns
        .map((col, index) => `${col} = $${index + 1}`)
        .join(", ");
      const values = Object.values(preparedData);

      const query = `
        UPDATE ${this.tableName}
        SET ${setClause}, updated_at = NOW()
        WHERE id = $${values.length + 1}
        RETURNING ${this.columns.join(", ")}
      `;

      this.logger.info("Updating record:", {
        table: this.tableName,
        id,
        data: Object.entries(preparedData).reduce(
          (acc, [key, value]) => {
            acc[key] = key.includes("password") ? "[REDACTED]" : value;
            return acc;
          },
          {} as Record<string, unknown>
        ),
      });

      const result = await this.executeQuery<Record<string, unknown>>(query, [
        ...values,
        id,
      ]);
      return result.rows.length ? this.mapResultToModel(result.rows[0]) : null;
    } catch (error) {
      if (
        error instanceof ValidationError ||
        error instanceof EntityNotFoundError
      ) {
        throw error;
      }
      throw new DatabaseError("update", this.entityName, String(error));
    }
  }

  /**
   * Delete a record
   */
  async delete(id: string): Promise<boolean> {
    try {
      const existing = await this.findById(id);
      if (!existing) {
        throw new EntityNotFoundError(this.entityName, id);
      }
      const query = `
        DELETE FROM ${this.tableName}
        WHERE id = $1
        RETURNING id
      `;

      this.logger.info("Deleting record:", {
        table: this.tableName,
        id,
      });

      const result = await this.executeQuery<Record<string, unknown>>(query, [
        id,
      ]);
      return result.rowCount > 0;
    } catch (error) {
      if (error instanceof EntityNotFoundError) {
        throw error;
      }
      throw new DatabaseError(
        "delete",
        this.entityName,
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  /**
   * Prepare data for database operations
   * Override this method in child repositories if needed
   */
  protected prepareDataForDatabase(data: Partial<T>): Record<string, unknown> {
    return { ...data } as Record<string, unknown>;
  }

  /**
   * Convert camelCase to snake_case
   */
  protected camelToSnake(str: string): string {
    return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
  }

  /**
   * Ensure the mapper includes type checking
   */
  protected abstract mapResultToModel(row: Record<string, unknown>): T;
}
