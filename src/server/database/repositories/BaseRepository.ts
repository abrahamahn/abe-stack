import { Pool, PoolClient } from "pg";

import { Logger } from "../../services/dev/logger/LoggerService";
import { DatabaseConnectionManager } from "../config";
import { BaseModelInterface } from "../models/BaseModel";

/**
 * Represents a validation error with field and message
 */
export interface ValidationError {
  field: string;
  message: string;
}

/**
 * Custom error thrown when validation fails
 */
export class ValidationFailedError extends Error {
  public errors: ValidationError[];

  constructor(errors: ValidationError[]) {
    super("Validation failed");
    this.name = "ValidationFailedError";
    this.errors = errors;
  }
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
   * Logger instance for this repository
   */
  protected logger: Logger;

  constructor() {
    this.logger = new Logger(this.constructor.name);
  }

  /**
   * Helper method for executing operations within a transaction
   * @param callback Function to execute within the transaction
   * @returns Result of the callback function
   */
  protected async withTransaction<R>(
    callback: (client: PoolClient) => Promise<R>,
  ): Promise<R> {
    return DatabaseConnectionManager.withTransaction(callback);
  }

  /**
   * Validate data before database operations
   * Override this method in child repositories to add specific validation rules
   * @param data The data to validate
   * @param isUpdate Whether this is for an update operation (partial data allowed)
   * @returns Validation errors if any
   */
  protected validateData(
    _data: Partial<T>,
    _isUpdate: boolean = false,
  ): ValidationError[] {
    const errors: ValidationError[] = [];

    // Basic validation that can be overridden in child repositories
    // This is just a placeholder for common validation logic

    return errors;
  }

  /**
   * Validate data and throw an error if validation fails
   * @param data The data to validate
   * @param isUpdate Whether this is for an update operation
   * @throws ValidationFailedError if validation fails
   */
  protected validateAndThrow(
    data: Partial<T>,
    isUpdate: boolean = false,
  ): void {
    const errors = this.validateData(data, isUpdate);
    if (errors.length > 0) {
      throw new ValidationFailedError(errors);
    }
  }

  /**
   * Convert an object to SQL parameters for prepared statements
   */
  protected objectToParams(
    obj: Partial<T>,
    startIndex: number = 1,
  ): [string[], (string | number | boolean | Date | null)[]] {
    const values: (string | number | boolean | Date | null)[] = [];
    const placeholders: string[] = [];

    Object.entries(obj).forEach(([_key, value], index) => {
      if (
        value !== undefined &&
        (typeof value === "string" ||
          typeof value === "number" ||
          typeof value === "boolean" ||
          value instanceof Date ||
          value === null)
      ) {
        values.push(value as string | number | boolean | Date | null);
        placeholders.push(`$${startIndex + index}`);
      }
    });

    return [placeholders, values];
  }

  /**
   * Execute a raw SQL query with proper error handling
   * @param sql SQL query string with placeholders
   * @param params Parameters for the query
   * @param client Optional database client for transactions
   * @returns Query result
   */
  protected async executeQuery<R extends Record<string, unknown>>(
    sql: string,
    params: unknown[] = [],
    client?: Pool,
  ): Promise<{ rows: R[]; rowCount: number }> {
    try {
      const dbClient = client || DatabaseConnectionManager.getPool();
      const result = await dbClient.query<R>(sql, params);
      return {
        rows: result.rows,
        rowCount: result.rowCount ?? 0,
      };
    } catch (error) {
      this.logger.error("Error executing query", {
        sql: sql.replace(/\s+/g, " ").trim(),
        params: params.map((p) =>
          typeof p === "string" && p.includes("password") ? "[REDACTED]" : p,
        ),
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  /**
   * Find records by a single field
   * @param field Field name
   * @param value Field value
   * @param options Query options
   * @returns Array of records
   */
  protected async findByField<R extends Record<string, unknown>>(
    field: string,
    value: string | number | boolean | Date | null,
    options: {
      limit?: number;
      offset?: number;
      orderBy?: string;
      client?: Pool;
    } = {},
  ): Promise<R[]> {
    const orderClause = options.orderBy ? `ORDER BY ${options.orderBy}` : "";
    const limitClause = options.limit ? `LIMIT ${options.limit}` : "";
    const offsetClause = options.offset ? `OFFSET ${options.offset}` : "";

    const query = `
      SELECT ${this.columns.join(", ")}
      FROM ${this.tableName}
      WHERE ${field} = $1
      ${orderClause}
      ${limitClause}
      ${offsetClause}
    `;

    const params = [value];
    if (options.limit) params.push(options.limit);
    if (options.offset) params.push(options.offset);

    const result = await this.executeQuery<R>(query, [value], options.client);
    return result.rows;
  }

  /**
   * Find a single record by a field
   * @param field Field name
   * @param value Field value
   * @param client Optional client for transactions
   * @returns Single record or null if not found
   */
  protected async findOneByField<R extends Record<string, unknown>>(
    field: string,
    value: string | number | boolean | Date | null,
    client?: Pool,
  ): Promise<R | null> {
    const query = `
      SELECT ${this.columns.join(", ")}
      FROM ${this.tableName}
      WHERE ${field} = $1
      LIMIT 1
    `;

    const result = await this.executeQuery<R>(query, [value], client);
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  /**
   * Count records by a field
   * @param field Field name
   * @param value Field value
   * @param client Optional client for transactions
   * @returns Count of matching records
   */
  protected async countByField(
    field: string,
    value: string | number | boolean | Date | null,
    client?: Pool,
  ): Promise<number> {
    const query = `
      SELECT COUNT(*) as count
      FROM ${this.tableName}
      WHERE ${field} = $1
    `;

    const result = await this.executeQuery<{ count: string }>(
      query,
      [value],
      client,
    );
    return parseInt(result.rows[0].count, 10);
  }

  /**
   * Find a record by its ID
   */
  async findById(id: string, client?: Pool): Promise<T | null> {
    const query = `
      SELECT ${this.columns.join(", ")}
      FROM ${this.tableName}
      WHERE id = $1
    `;

    try {
      const result = await (
        client || DatabaseConnectionManager.getPool()
      ).query<T>(query, [id]);
      return result.rows[0] as T | null;
    } catch (error) {
      this.logger.error("Error in findById", {
        id,
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  /**
   * Find all records matching the given criteria
   */
  async findAll(
    where: Partial<T> = {},
    options: {
      limit?: number;
      offset?: number;
      orderBy?: string;
      client?: Pool;
    } = {},
  ): Promise<T[]> {
    const conditions: string[] = [];
    const values: (string | number | boolean | Date | null)[] = [];
    let paramIndex = 1;

    Object.entries(where).forEach(([key, value]) => {
      if (value !== undefined) {
        conditions.push(`${key} = $${paramIndex}`);
        if (
          typeof value === "string" ||
          typeof value === "number" ||
          typeof value === "boolean" ||
          value instanceof Date ||
          value === null
        ) {
          values.push(value as string | number | boolean | Date | null);
          paramIndex++;
        }
      }
    });

    const query = `
      SELECT ${this.columns.join(", ")}
      FROM ${this.tableName}
      ${conditions.length ? "WHERE " + conditions.join(" AND ") : ""}
      ${options.orderBy ? `ORDER BY ${options.orderBy}` : ""}
      ${options.limit ? `LIMIT $${paramIndex++}` : ""}
      ${options.offset ? `OFFSET $${paramIndex}` : ""}
    `;

    if (options.limit) values.push(options.limit);
    if (options.offset) values.push(options.offset);

    try {
      const result = await (
        options.client || DatabaseConnectionManager.getPool()
      ).query<T>(query, values);
      return result.rows;
    } catch (error) {
      this.logger.error("Error in findAll", {
        where,
        options,
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  /**
   * Convert camelCase to snake_case
   */
  protected camelToSnake(str: string): string {
    return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
  }

  /**
   * Create a new record
   */
  async create(data: Partial<T>, client?: Pool): Promise<T> {
    try {
      // Validate data before inserting
      this.validateAndThrow(data, false);

      // Convert camelCase keys to snake_case
      const snakeCaseData = Object.entries(data).reduce(
        (acc, [key, value]) => {
          acc[this.camelToSnake(key)] = value;
          return acc;
        },
        {} as Record<string, unknown>,
      ) as unknown as Partial<T>;

      const [placeholders, values] = this.objectToParams(snakeCaseData);
      const columns = Object.keys(snakeCaseData).join(", ");

      const query = `
        INSERT INTO ${this.tableName} (${columns})
        VALUES (${placeholders.join(", ")})
        RETURNING ${this.columns.join(", ")}
      `;

      this.logger.info("Creating record:", {
        table: this.tableName,
        data: Object.entries(snakeCaseData).reduce(
          (acc, [key, value]) => {
            acc[key] = key.includes("password") ? "[REDACTED]" : value;
            return acc;
          },
          {} as Record<string, unknown>,
        ),
      });

      this.logger.info("Generated SQL:", {
        query,
        values: values.map((v, i) => {
          if (
            typeof values[i] === "string" &&
            values[i].toString().includes("password")
          ) {
            return "[REDACTED]";
          }
          return v instanceof Date ? v.toISOString() : v;
        }),
      });

      const result = await (
        client || DatabaseConnectionManager.getPool()
      ).query<T>(query, values);

      this.logger.info("Create query successful:", {
        rowCount: result.rowCount,
        returnedColumns: Object.keys(result.rows[0] || {}),
      });

      return result.rows[0];
    } catch (error) {
      if (error instanceof ValidationFailedError) {
        this.logger.warn("Validation failed in create", {
          table: this.tableName,
          errors: error.errors,
          data: Object.entries(data).reduce(
            (acc, [key, value]) => {
              acc[key] = key.includes("password") ? "[REDACTED]" : value;
              return acc;
            },
            {} as Record<string, unknown>,
          ),
        });
        throw error;
      }

      this.logger.error("Error in create", {
        table: this.tableName,
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  /**
   * Update an existing record
   */
  async update(id: string, data: Partial<T>, client?: Pool): Promise<T | null> {
    try {
      // Validate data before updating
      this.validateAndThrow(data, true);

      const [placeholders, values] = this.objectToParams(data);
      const setClause = Object.keys(data)
        .map((key, index) => `${key} = ${placeholders[index]}`)
        .join(", ");

      const query = `
        UPDATE ${this.tableName}
        SET ${setClause}, updated_at = NOW()
        WHERE id = $${values.length + 1}
        RETURNING ${this.columns.join(", ")}
      `;

      this.logger.info("Updating record:", {
        table: this.tableName,
        id,
        data: Object.entries(data).reduce(
          (acc, [key, value]) => {
            acc[key] = key.includes("password") ? "[REDACTED]" : value;
            return acc;
          },
          {} as Record<string, unknown>,
        ),
      });

      const result = await (
        client || DatabaseConnectionManager.getPool()
      ).query<T>(query, [...values, id]);
      return result.rows[0] || null;
    } catch (error) {
      if (error instanceof ValidationFailedError) {
        this.logger.warn("Validation failed in update", {
          table: this.tableName,
          id,
          errors: error.errors,
          data: Object.entries(data).reduce(
            (acc, [key, value]) => {
              acc[key] = key.includes("password") ? "[REDACTED]" : value;
              return acc;
            },
            {} as Record<string, unknown>,
          ),
        });
        throw error;
      }

      this.logger.error("Error in update", {
        id,
        data: Object.entries(data).reduce(
          (acc, [key, value]) => {
            acc[key] = key.includes("password") ? "[REDACTED]" : value;
            return acc;
          },
          {} as Record<string, unknown>,
        ),
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  /**
   * Delete a record
   */
  async delete(id: string, client?: Pool): Promise<boolean> {
    const query = `
      DELETE FROM ${this.tableName}
      WHERE id = $1
      RETURNING id
    `;

    try {
      this.logger.info("Deleting record:", {
        table: this.tableName,
        id,
      });

      const pool = client || DatabaseConnectionManager.getPool();
      const result = await pool.query<T>(query, [id]);
      const rowCount = result.rowCount ?? 0;
      return rowCount > 0;
    } catch (error) {
      this.logger.error("Error in delete", {
        id,
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  /**
   * Count records matching the given criteria
   */
  async count(where: Partial<T> = {}, client?: Pool): Promise<number> {
    const conditions: string[] = [];
    const values: (string | number | boolean | Date | null)[] = [];
    let paramIndex = 1;

    Object.entries(where).forEach(([key, value]) => {
      if (value !== undefined) {
        conditions.push(`${key} = $${paramIndex}`);
        if (
          typeof value === "string" ||
          typeof value === "number" ||
          typeof value === "boolean" ||
          value instanceof Date ||
          value === null
        ) {
          values.push(value as string | number | boolean | Date | null);
          paramIndex++;
        }
      }
    });

    const query = `
      SELECT COUNT(*) as count
      FROM ${this.tableName}
      ${conditions.length ? "WHERE " + conditions.join(" AND ") : ""}
    `;

    try {
      const result = await (
        client || DatabaseConnectionManager.getPool()
      ).query<{ count: string }>(query, values);
      return parseInt(result.rows[0].count);
    } catch (error) {
      this.logger.error("Error in count", {
        where,
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  // Add a safe mapping method for query results
  protected mapResultRows<R>(
    rows: unknown[],
    mapper: (row: Record<string, unknown>) => R,
  ): R[] {
    return rows.map((row) => mapper(row as Record<string, unknown>));
  }

  // Add a safe method to get a single result
  protected getSingleResult<R>(
    rows: unknown[],
    mapper: (row: Record<string, unknown>) => R,
  ): R | null {
    if (!rows.length) return null;
    return this.mapResultRows(rows, mapper)[0];
  }

  // Ensure the mapper includes type checking
  protected abstract mapResultToModel(row: Record<string, unknown>): T;
}
