import { IDatabaseServer } from "@infrastructure/database";
import { ILoggerService } from "@infrastructure/logging";
import { DbQueryResultRow } from "@/server/infrastructure/database/IDatabaseServer";

/**
 * Base service class that provides common functionality for all services.
 * Services are responsible for:
 * 1. Orchestrating operations between repositories
 * 2. Implementing business logic that spans multiple repositories
 * 3. Managing transactions
 * 4. Providing a clean API for controllers
 */
export abstract class BaseService {
  constructor(
    protected logger: ILoggerService,
    protected databaseService: IDatabaseServer
  ) {}

  /**
   * Execute a query within a transaction
   */
  protected async withTransaction<T>(
    callback: (client: any) => Promise<T>
  ): Promise<T> {
    return this.databaseService.withTransaction(callback);
  }

  /**
   * Execute a query and return the rows
   */
  protected async query<T extends DbQueryResultRow>(
    text: string,
    params?: unknown[]
  ): Promise<T[]> {
    const result = await this.databaseService.query<T>(text, params);
    return result.rows;
  }
}
