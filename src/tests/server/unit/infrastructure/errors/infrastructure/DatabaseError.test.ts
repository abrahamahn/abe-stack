import {
  DatabaseError,
  EntityNotFoundError,
  UniqueConstraintError,
  ForeignKeyConstraintError,
} from "@/server/infrastructure/errors/infrastructure/DatabaseError";

describe("DatabaseError", () => {
  describe("DatabaseError", () => {
    it("should create a database error with operation and entity", () => {
      const error = new DatabaseError("create", "User");
      expect(error.message).toBe("Database operation 'create' failed for User");
      expect(error.code).toBe("DATABASE_ERROR");
      expect(error.operation).toBe("create");
      expect(error.entity).toBe("User");
    });

    it("should create a database error with cause as Error", () => {
      const cause = new Error("Connection failed");
      const error = new DatabaseError("query", "Post", cause);
      expect(error.message).toBe(
        "Database operation 'query' failed for Post: Connection failed",
      );
      expect(error.code).toBe("DATABASE_ERROR");
      expect(error.operation).toBe("query");
      expect(error.entity).toBe("Post");
      expect(error.cause).toBe(cause);
    });

    it("should create a database error with cause as string", () => {
      const error = new DatabaseError("update", "Comment", "Invalid data");
      expect(error.message).toBe(
        "Database operation 'update' failed for Comment: Invalid data",
      );
      expect(error.code).toBe("DATABASE_ERROR");
      expect(error.operation).toBe("update");
      expect(error.entity).toBe("Comment");
      expect(error.cause).toBe("Invalid data");
    });

    it("should create a database error with custom code", () => {
      const error = new DatabaseError(
        "delete",
        "User",
        "Permission denied",
        "ACCESS_DENIED",
      );
      expect(error.message).toBe(
        "Database operation 'delete' failed for User: Permission denied",
      );
      expect(error.code).toBe("ACCESS_DENIED");
    });
  });

  describe("EntityNotFoundError", () => {
    it("should create an entity not found error", () => {
      const error = new EntityNotFoundError("User", "123");
      expect(error.message).toBe(
        "Database operation 'find' failed for User with identifier 123 not found",
      );
      expect(error.code).toBe("ENTITY_NOT_FOUND");
      expect(error.entity).toBe("User");
      expect(error.identifier).toBe("123");
    });

    it("should handle numeric identifiers", () => {
      const error = new EntityNotFoundError("Post", 456);
      expect(error.message).toBe(
        "Database operation 'find' failed for Post with identifier 456 not found",
      );
      expect(error.identifier).toBe(456);
    });
  });

  describe("UniqueConstraintError", () => {
    it("should create a unique constraint error", () => {
      const error = new UniqueConstraintError(
        "User",
        "email",
        "test@example.com",
      );
      expect(error.message).toBe(
        "Database operation 'create/update' failed for User with email 'test@example.com' already exists",
      );
      expect(error.code).toBe("UNIQUE_CONSTRAINT_VIOLATION");
      expect(error.entity).toBe("User");
      expect(error.field).toBe("email");
      expect(error.value).toBe("test@example.com");
    });

    it("should handle numeric values", () => {
      const error = new UniqueConstraintError("Product", "code", 12345);
      expect(error.message).toBe(
        "Database operation 'create/update' failed for Product with code '12345' already exists",
      );
      expect(error.value).toBe(12345);
    });
  });

  describe("ForeignKeyConstraintError", () => {
    it("should create a foreign key constraint error", () => {
      const error = new ForeignKeyConstraintError(
        "Comment",
        "user_id",
        "invalid_user",
      );
      expect(error.message).toBe(
        "Database operation 'create/update' failed for Comment violates foreign key constraint 'user_id' with value 'invalid_user'",
      );
      expect(error.code).toBe("FOREIGN_KEY_CONSTRAINT_VIOLATION");
      expect(error.entity).toBe("Comment");
      expect(error.constraint).toBe("user_id");
      expect(error.value).toBe("invalid_user");
    });

    it("should handle numeric values", () => {
      const error = new ForeignKeyConstraintError("Order", "product_id", 999);
      expect(error.message).toBe(
        "Database operation 'create/update' failed for Order violates foreign key constraint 'product_id' with value '999'",
      );
      expect(error.value).toBe(999);
    });
  });
});
