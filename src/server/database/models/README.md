# Models and Repositories Guidelines

This document outlines the standard approach for implementing models and repositories in the application.

## Model Implementation

All models should:

1. Extend the `BaseModel` class
2. Implement a corresponding interface that extends `BaseModelInterface`
3. Have a clear separation between the model (data structure) and repository (data access)

### Model Template

```typescript
import { BaseModel, BaseModelInterface } from "../BaseModel";

// Define the model interface
export interface ExampleAttributes extends BaseModelInterface {
  // Add model-specific properties
  name: string;
  description: string | null;
  // ...other properties
}

// Implement the model class
export class Example extends BaseModel implements ExampleAttributes {
  // Declare all properties
  name: string;
  description: string | null;
  // ...other properties

  // Constructor with required fields
  constructor(data: Partial<ExampleAttributes> & { name: string }) {
    super();
    this.id = data.id || this.generateId();
    this.name = data.name;
    this.description = data.description || null;
    // ...set other properties
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  // Serialize to JSON
  toJSON(): ExampleAttributes {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      // ...other properties
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  // Add model-specific methods
  updateName(name: string): void {
    this.name = name;
    this.updatedAt = new Date();
  }
}
```

## Repository Implementation

All repositories should:

1. Extend the `BaseRepository` class
2. Implement standard CRUD operations
3. Add domain-specific query methods as needed

### Repository Template

```typescript
import { Pool } from "pg";

import { DatabaseConnectionManager } from "../../../config/database";
import { Logger } from "../../../core/services/LoggerService";
import { Example, ExampleAttributes } from "../../models/domain/Example";
import { BaseRepository } from "../BaseRepository";

export class ExampleRepository extends BaseRepository<ExampleAttributes> {
  protected logger = new Logger("ExampleRepository");
  protected tableName = "examples";
  protected columns = [
    "id",
    "name",
    "description",
    "created_at as createdAt",
    "updated_at as updatedAt",
  ];

  /**
   * Find example by primary key
   */
  async findByPk(id: string): Promise<Example | null> {
    const example = await this.findById(id);
    if (!example) return null;

    return new Example(example);
  }

  /**
   * Find examples by a specific field
   */
  async findByField(
    fieldName: string,
    value: string,
    limit: number = 20,
    offset: number = 0,
  ): Promise<Example[]> {
    const db = DatabaseConnectionManager.getInstance();
    const query = `
      SELECT ${this.columns.join(", ")}
      FROM ${this.tableName}
      WHERE ${this.snakeCase(fieldName)} = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `;

    const { rows } = await db.query(query, [value, limit, offset]);
    return rows.map((row) => new Example(row));
  }

  /**
   * Create a new example
   */
  async create(
    data: Omit<ExampleAttributes, "id" | "createdAt" | "updatedAt">,
  ): Promise<Example> {
    const db = DatabaseConnectionManager.getInstance();
    const client = await db.getClient();

    try {
      await client.query("BEGIN");

      // Convert camelCase to snake_case for database columns
      const insertData: Record<string, unknown> = {};
      Object.entries(data).forEach(([key, value]) => {
        insertData[this.snakeCase(key)] = value;
      });

      const insertColumns = Object.keys(insertData);
      const placeholders = insertColumns.map((_, idx) => `$${idx + 1}`);
      const values = Object.values(insertData);

      const query = `
        INSERT INTO ${this.tableName} (${insertColumns.join(", ")}, created_at, updated_at)
        VALUES (${placeholders.join(", ")}, NOW(), NOW())
        RETURNING ${this.columns.join(", ")}
      `;

      const { rows } = await client.query(query, values);
      await client.query("COMMIT");

      return new Example(rows[0]);
    } catch (error) {
      await client.query("ROLLBACK");
      this.logger.error("Error creating example", error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Convert camelCase to snake_case
   */
  private snakeCase(str: string): string {
    return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
  }
}
```

## Usage Pattern

When using models and repositories, follow this pattern:

```typescript
// Import the repository
import { exampleRepository } from "../repositories/domain/ExampleRepository";

// Use the repository to access data
const example = await exampleRepository.findByPk("some-id");
if (example) {
  // Use the model methods
  example.updateName("New Name");

  // Save changes
  await exampleRepository.update(example.id, example);
}

// Create a new instance
const newExample = new Example({ name: "Example Name" });
await exampleRepository.create(newExample);
```

## Repository Singleton Pattern

For each repository, create a singleton instance:

```typescript
// At the end of the repository file
export const exampleRepository = new ExampleRepository();
```

This ensures consistent access to repositories throughout the application.
