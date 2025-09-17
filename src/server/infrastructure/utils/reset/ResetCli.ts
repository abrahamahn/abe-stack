import { Container } from "inversify";
import { TYPES } from "../../di";
import { ILoggerService } from "../../logging";
import { DatabaseServer } from "../../database";
import { ConfigService } from "../../config";
import { CacheService } from "../../cache";
import { ResetService } from "./ResetService";

/**
 * CLI utility for resetting application state
 */
export class ResetCli {
  private resetService: ResetService;

  constructor(container: Container) {
    const logger = container.get<ILoggerService>(TYPES.LoggerService);
    const databaseServer = container.get<DatabaseServer>(TYPES.DatabaseService);
    const configService = container.get<ConfigService>(TYPES.ConfigService);
    const cacheService = container.get<CacheService>(TYPES.CacheService);
    this.resetService = new ResetService(logger, databaseServer, configService, cacheService);
  }

  /**
   * Run a reset operation
   * @param args Command line arguments
   */
  async run(args: string[]): Promise<void> {
    if (args.length === 0) {
      this.printHelp();
      return;
    }

    const command = args[0].toLowerCase();

    try {
      switch (command) {
        case "db":
        case "database":
          await this.resetService.resetDatabase();
          break;
        case "users":
          await this.resetService.resetUsers();
          break;
        case "config":
          await this.resetService.resetConfig();
          break;
        case "cache":
          await this.resetService.resetCache();
          break;
        case "all":
          await this.resetService.resetDatabase();
          await this.resetService.resetUsers();
          await this.resetService.resetConfig();
          await this.resetService.resetCache();
          break;
        case "help":
          this.printHelp();
          break;
        default:
          console.error(`Unknown command: ${command}`);
          this.printHelp();
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      switch (command) {
        case "db":
        case "database":
          console.error("Error resetting database:", errorMessage);
          break;
        case "users":
          console.error("Error resetting users:", errorMessage);
          break;
        case "config":
          console.error("Error resetting config:", errorMessage);
          break;
        case "cache":
          console.error("Error resetting cache:", errorMessage);
          break;
        case "all":
          console.error("Error resetting all:", errorMessage);
          break;
        default:
          console.error("Error:", errorMessage);
      }
      throw error;
    }
  }

  /**
   * Print help information
   */
  private printHelp(): void {
    console.log("Reset CLI Usage:");
    console.log("  reset database   - Reset the database to its initial state");
    console.log("  reset users      - Reset user data");
    console.log("  reset config     - Reset application configuration");
    console.log("  reset cache      - Reset cache");
    console.log("  reset all        - Reset everything");
    console.log("  reset help       - Show this help");
  }
}