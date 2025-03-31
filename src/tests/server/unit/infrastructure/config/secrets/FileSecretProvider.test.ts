import * as fs from "fs";

import { FileSecretProvider } from "@/server/infrastructure/config/secrets/FileSecretProvider";
import type { ILoggerService } from "@/server/infrastructure/logging";

// Mock fs
jest.mock("fs");
const mockedFs = fs as jest.Mocked<typeof fs>;

// Mock path
jest.mock("path", () => ({
  ...jest.requireActual("path"),
  resolve: jest.fn().mockImplementation((...args) => args.join("/")),
}));

describe("FileSecretProvider", () => {
  // Mock file paths and content
  const mockFilePath = "/path/to/secrets.json";
  const mockSecrets = {
    API_KEY: "api-key-12345",
    DATABASE_PASSWORD: "db-password-secure",
    JWT_SECRET: "jwt-secret-token",
    EMPTY_SECRET: "",
  };

  // Create mock logger
  const mockLogger: ILoggerService = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    createLogger: jest.fn().mockReturnThis(),
    withContext: jest.fn().mockReturnThis(),
    debugObj: jest.fn(),
    infoObj: jest.fn(),
    warnObj: jest.fn(),
    errorObj: jest.fn(),
    addTransport: jest.fn(),
    setTransports: jest.fn(),
    setMinLevel: jest.fn(),
    initialize: jest.fn().mockResolvedValue(undefined),
    shutdown: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Mock fs.existsSync
    mockedFs.existsSync.mockReturnValue(true);

    // Mock fs.readFileSync
    mockedFs.readFileSync.mockReturnValue(JSON.stringify(mockSecrets));

    // Mock process.cwd
    jest.spyOn(process, "cwd").mockReturnValue("/app");
  });

  describe("Initialization", () => {
    it("should load secrets from a JSON file during initialization", async () => {
      const provider = new FileSecretProvider(mockFilePath, mockLogger);

      await provider.initialize!();

      // Check that the file was read
      expect(mockedFs.readFileSync).toHaveBeenCalledWith(
        expect.stringContaining(mockFilePath),
        "utf8",
      );

      // Verify initialization succeeded by checking that a secret is available
      expect(await provider.supportsSecret("API_KEY")).toBe(true);
      expect(await provider.getSecret("API_KEY")).toBe("api-key-12345");
    });

    it("should handle missing files gracefully", async () => {
      // Mock file not existing
      mockedFs.existsSync.mockReturnValue(false);

      const provider = new FileSecretProvider(mockFilePath, mockLogger);

      await provider.initialize!();

      // Verify initialization gracefully handles missing files
      expect(await provider.supportsSecret("ANY_KEY")).toBe(false);
    });

    it("should handle invalid JSON gracefully", async () => {
      // Mock invalid JSON
      mockedFs.readFileSync.mockReturnValue("not valid json");

      const provider = new FileSecretProvider(mockFilePath, mockLogger);

      await provider.initialize!();

      // Verify initialization gracefully handles invalid JSON
      expect(await provider.supportsSecret("ANY_KEY")).toBe(false);
    });
  });

  describe("Secret retrieval", () => {
    it("should retrieve secrets that exist in the file", async () => {
      const provider = new FileSecretProvider(mockFilePath);

      // Ensure initialization happens first
      await provider.initialize!();

      // Check for existing secrets
      expect(await provider.supportsSecret("API_KEY")).toBe(true);
      expect(await provider.getSecret("API_KEY")).toBe("api-key-12345");

      expect(await provider.supportsSecret("DATABASE_PASSWORD")).toBe(true);
      expect(await provider.getSecret("DATABASE_PASSWORD")).toBe(
        "db-password-secure",
      );

      expect(await provider.supportsSecret("JWT_SECRET")).toBe(true);
      expect(await provider.getSecret("JWT_SECRET")).toBe("jwt-secret-token");
    });

    it("should handle empty string secrets", async () => {
      const provider = new FileSecretProvider(mockFilePath);

      await provider.initialize!();

      expect(await provider.supportsSecret("EMPTY_SECRET")).toBe(true);
      expect(await provider.getSecret("EMPTY_SECRET")).toBe("");
    });

    it("should return undefined for non-existent secrets", async () => {
      const provider = new FileSecretProvider(mockFilePath);

      await provider.initialize!();

      expect(await provider.supportsSecret("NON_EXISTENT")).toBe(false);
      expect(await provider.getSecret("NON_EXISTENT")).toBeUndefined();
    });

    it("should automatically initialize when getting a secret without explicit initialization", async () => {
      const provider = new FileSecretProvider(mockFilePath, mockLogger);

      // Skip explicit initialization and directly get a secret
      const secret = await provider.getSecret("API_KEY");

      // Verify that initialization happened implicitly
      expect(mockedFs.readFileSync).toHaveBeenCalledWith(
        expect.stringContaining(mockFilePath),
        "utf8",
      );
      expect(secret).toBe("api-key-12345");
    });
  });

  describe("Multiple provider instances", () => {
    it("should load different files for different instances", async () => {
      // Setup mocks for multiple files
      const secondFilePath = "/path/to/other-secrets.json";
      const secondSecrets = {
        OTHER_API_KEY: "other-api-key",
        OTHER_SECRET: "other-secret-value",
      };

      // Mock fs.existsSync to return true for both files
      mockedFs.existsSync.mockReturnValue(true);

      // Mock fs.readFileSync to return different content based on path
      mockedFs.readFileSync.mockImplementation((path) => {
        if (String(path).includes("other-secrets")) {
          return JSON.stringify(secondSecrets);
        }
        return JSON.stringify(mockSecrets);
      });

      const provider1 = new FileSecretProvider(mockFilePath);
      const provider2 = new FileSecretProvider(secondFilePath);

      await provider1.initialize!();
      await provider2.initialize!();

      // Check first provider
      expect(await provider1.supportsSecret("API_KEY")).toBe(true);
      expect(await provider1.getSecret("API_KEY")).toBe("api-key-12345");
      expect(await provider1.supportsSecret("OTHER_API_KEY")).toBe(false);

      // Check second provider
      expect(await provider2.supportsSecret("OTHER_API_KEY")).toBe(true);
      expect(await provider2.getSecret("OTHER_API_KEY")).toBe("other-api-key");
      expect(await provider2.supportsSecret("API_KEY")).toBe(false);
    });
  });
});
