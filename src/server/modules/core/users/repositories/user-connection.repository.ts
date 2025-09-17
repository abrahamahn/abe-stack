import { injectable, inject } from "inversify";

import { UserConnection, ConnectionStatus } from "./UserConnection";
import { TYPES } from "../../../infrastructure/di/types";
import { BaseRepository } from "../../base/baseRepository";

// Use 'import type' for types used in decorated signatures
import type { IDatabaseServer } from "../../../infrastructure/database";
import type { ILoggerService } from "../../../infrastructure/logging";

/**
 * Repository for managing user connections
 */
@injectable()
export class UserConnectionRepository extends BaseRepository<UserConnection> {
  /**
   * The database table name
   */
  protected tableName: string = "user_connections";

  /**
   * The table columns
   */
  protected columns: string[] = [
    "id",
    "requester_id",
    "addressee_id",
    "status",
    "connected_at",
    "rejected_at",
    "blocked_at",
    "notes",
    "created_at",
    "updated_at",
  ];

  /**
   * Constructor
   */
  constructor(
    @inject(TYPES.LoggerService) logger: ILoggerService,
    @inject(TYPES.DatabaseService) databaseService: IDatabaseServer
  ) {
    super(logger, databaseService, "UserConnection");
  }

  /**
   * Find a connection between two users
   */
  async findConnection(
    user1Id: string,
    user2Id: string
  ): Promise<UserConnection | null> {
    try {
      const query = `
        SELECT ${this.columns.join(", ")}
        FROM ${this.tableName}
        WHERE 
          (requester_id = $1 AND addressee_id = $2)
          OR
          (requester_id = $2 AND addressee_id = $1)
        LIMIT 1
      `;

      const result = await this.executeQuery(query, [user1Id, user2Id]);

      if (result.rowCount === 0) {
        return null;
      }

      return this.mapResultToModel(result.rows[0]);
    } catch (error) {
      this.logger.error("Error finding connection between users", {
        user1Id,
        user2Id,
        error,
      });
      return null;
    }
  }

  /**
   * Find all connections for a user
   */
  async findAllForUser(
    userId: string,
    status?: ConnectionStatus
  ): Promise<UserConnection[]> {
    try {
      let query = `
        SELECT ${this.columns.join(", ")}
        FROM ${this.tableName}
        WHERE requester_id = $1 OR addressee_id = $1
      `;

      const params: any[] = [userId];

      if (status) {
        query += ` AND status = $2`;
        params.push(status);
      }

      const result = await this.executeQuery(query, params);
      return result.rows.map((row) => this.mapResultToModel(row));
    } catch (error) {
      this.logger.error("Error finding connections for user", {
        userId,
        status,
        error,
      });
      return [];
    }
  }

  /**
   * Find all connections initiated by a user
   */
  async findRequestedByUser(
    userId: string,
    status?: ConnectionStatus
  ): Promise<UserConnection[]> {
    try {
      let query = `
        SELECT ${this.columns.join(", ")}
        FROM ${this.tableName}
        WHERE requester_id = $1
      `;

      const params: any[] = [userId];

      if (status) {
        query += ` AND status = $2`;
        params.push(status);
      }

      const result = await this.executeQuery(query, params);
      return result.rows.map((row) => this.mapResultToModel(row));
    } catch (error) {
      this.logger.error("Error finding requests by user", {
        userId,
        status,
        error,
      });
      return [];
    }
  }

  /**
   * Find all connections received by a user
   */
  async findReceivedByUser(
    userId: string,
    status?: ConnectionStatus
  ): Promise<UserConnection[]> {
    try {
      let query = `
        SELECT ${this.columns.join(", ")}
        FROM ${this.tableName}
        WHERE addressee_id = $1
      `;

      const params: any[] = [userId];

      if (status) {
        query += ` AND status = $2`;
        params.push(status);
      }

      const result = await this.executeQuery(query, params);
      return result.rows.map((row) => this.mapResultToModel(row));
    } catch (error) {
      this.logger.error("Error finding requests to user", {
        userId,
        status,
        error,
      });
      return [];
    }
  }

  /**
   * Count connections for a user by status
   */
  async countByStatus(
    userId: string,
    status: ConnectionStatus
  ): Promise<number> {
    try {
      const query = `
        SELECT COUNT(*) as count
        FROM ${this.tableName}
        WHERE (requester_id = $1 OR addressee_id = $1)
        AND status = $2
      `;

      const result = await this.executeQuery<{ count: string }>(query, [
        userId,
        status,
      ]);

      return parseInt(result.rows[0].count, 10);
    } catch (error) {
      this.logger.error("Error counting connections by status", {
        userId,
        status,
        error,
      });
      return 0;
    }
  }

  /**
   * Map database row to model
   */
  protected mapResultToModel(row: Record<string, unknown>): UserConnection {
    return new UserConnection({
      id: row.id as string,
      requesterId: row.requester_id as string,
      addresseeId: row.addressee_id as string,
      status: row.status as ConnectionStatus,
      connectedAt: row.connected_at
        ? new Date(row.connected_at as string)
        : undefined,
      rejectedAt: row.rejected_at
        ? new Date(row.rejected_at as string)
        : undefined,
      blockedAt: row.blocked_at
        ? new Date(row.blocked_at as string)
        : undefined,
      notes: row.notes as string | undefined,
      createdAt: row.created_at
        ? new Date(row.created_at as string)
        : new Date(),
      updatedAt: row.updated_at
        ? new Date(row.updated_at as string)
        : new Date(),
    });
  }
}
