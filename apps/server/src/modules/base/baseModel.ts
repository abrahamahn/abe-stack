import { v4 as uuidv4 } from "uuid";

/**
 * Base model interface that all models should extend.
 * Models are responsible for:
 * 1. Defining the data structure and types
 * 2. Implementing business logic and validation rules
 * 3. Providing methods for data transformation and manipulation
 * 4. NOT handling database operations (that's the repository's job)
 */
export interface BaseModelInterface {
  /**
   * Unique identifier for the model
   */
  id: string;

  /**
   * Creation timestamp
   */
  createdAt: Date;

  /**
   * Last update timestamp
   */
  updatedAt: Date;
}

/**
 * Base model class that provides common functionality for all models.
 * This class should be extended by all domain models.
 *
 * Responsibilities:
 * - Define the data structure
 * - Implement business logic
 * - Handle data validation
 * - Provide data transformation methods
 * - NOT handle database operations
 */
export abstract class BaseModel {
  /**
   * Unique identifier for the model
   */
  id: string;

  /**
   * Creation timestamp
   */
  createdAt: Date;

  /**
   * Last update timestamp
   */
  updatedAt: Date;

  /**
   * Index signature to allow additional properties
   */
  [key: string]: unknown;

  constructor() {
    this.id = "";
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }

  /**
   * Generate a unique ID for new model instances.
   * This is a utility method for model creation, not database operations.
   */
  protected generateId(): string {
    return uuidv4();
  }

  /**
   * Validate the model
   * @returns Array of validation errors
   */
  abstract validate(): Array<{ field: string; message: string; code?: string }>;

  /**
   * Convert model to string representation
   */
  abstract toString(): string;
}
