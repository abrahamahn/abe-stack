import { describe, it, expect, vi, beforeEach } from "vitest";

import { IConfigService } from "@/server/infrastructure/config";
import { ILoggerService } from "@/server/infrastructure/logging";
import { CorsConfigService } from "@/server/infrastructure/security/CorsConfigService";

// Mock the ConfigService
const mockConfigService = {
  get: vi.fn(),
  getWithDefault: vi.fn(),
  getNumber: vi.fn(),
  getBoolean: vi.fn(),
  getString: vi.fn(),
  getArray: vi.fn(),
  getObject: vi.fn(),
  getConfig: vi.fn(),
  isProduction: vi.fn(),
  isDevelopment: vi.fn(),
  isTest: vi.fn(),
  ensureValid: vi.fn(),
  loadConfig: vi.fn(),
  reloadConfig: vi.fn(),
  getConfigPath: vi.fn(),
  getEnvironment: vi.fn(),
  getConfigSchema: vi.fn(),
  validate: vi.fn(),
  getErrors: vi.fn(),
  clearErrors: vi.fn(),
  hasErrors: vi.fn(),
} as unknown as IConfigService;

// Mock logger
const mockLogger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debugObj: vi.fn(),
  infoObj: vi.fn(),
  warnObj: vi.fn(),
  errorObj: vi.fn(),
  setLevel: vi.fn(),
  getLevel: vi.fn(),
  setContext: vi.fn(),
} as unknown as ILoggerService;

describe("CorsConfigService", () => {
  let corsConfigService: CorsConfigService;

  beforeEach(() => {
    vi.resetAllMocks();
    corsConfigService = new CorsConfigService(mockConfigService, mockLogger);
  });

  describe("getCorsConfiguration", () => {
    it("should return default CORS configuration when config is missing", () => {
      vi.mocked(mockConfigService.get).mockReturnValue(undefined);

      const corsConfig = corsConfigService.getCorsConfiguration();

      expect(corsConfig.origin).toBe("*");
      expect(corsConfig.credentials).toBe(true);
      expect(corsConfig.maxAge).toBe(86400);
    });

    it("should return custom CORS configuration when config is provided", () => {
      vi.mocked(mockConfigService.get).mockImplementation((key: string) => {
        switch (key) {
          case "cors.origin":
            return "http://example.com";
          case "cors.maxAge":
            return "3600";
          case "cors.allowCredentials":
            return "false";
          default:
            return undefined;
        }
      });

      const corsConfig = corsConfigService.getCorsConfiguration();

      expect(corsConfig.origin).toBe("http://example.com");
      expect(corsConfig.credentials).toBe(false);
      expect(corsConfig.maxAge).toBe(3600);
    });

    it("should handle array of origins", () => {
      vi.mocked(mockConfigService.get).mockImplementation((key: string) => {
        switch (key) {
          case "cors.origin":
            return ["http://example.com", "http://localhost:3000"];
          default:
            return undefined;
        }
      });

      const corsConfig = corsConfigService.getCorsConfiguration();

      expect(corsConfig.origin).toEqual([
        "http://example.com",
        "http://localhost:3000",
      ]);
    });

    it("should handle empty array of origins and default to wildcard", () => {
      vi.mocked(mockConfigService.get).mockImplementation((key: string) => {
        switch (key) {
          case "cors.origin":
            return [];
          default:
            return undefined;
        }
      });

      const corsConfig = corsConfigService.getCorsConfiguration();

      expect(corsConfig.origin).toBe("*");
    });

    it("should handle comma-separated list of origins", () => {
      vi.mocked(mockConfigService.get).mockImplementation((key: string) => {
        switch (key) {
          case "cors.origin":
            return "http://example.com, http://localhost:3000";
          default:
            return undefined;
        }
      });

      const corsConfig = corsConfigService.getCorsConfiguration();

      expect(corsConfig.origin).toEqual([
        "http://example.com",
        "http://localhost:3000",
      ]);
    });

    it("should handle boolean origins (false to disable CORS)", () => {
      vi.mocked(mockConfigService.get).mockImplementation((key: string) => {
        switch (key) {
          case "cors.origin":
            return false;
          default:
            return undefined;
        }
      });

      const corsConfig = corsConfigService.getCorsConfiguration();

      expect(corsConfig.origin).toBe(false);
    });

    it("should handle null origin and default to wildcard", () => {
      vi.mocked(mockConfigService.get).mockImplementation((key: string) => {
        switch (key) {
          case "cors.origin":
            return null;
          default:
            return undefined;
        }
      });

      const corsConfig = corsConfigService.getCorsConfiguration();

      expect(corsConfig.origin).toBe("*");
    });

    it("should handle regular expression origins", () => {
      const originRegex = /example\.com$/;
      vi.mocked(mockConfigService.get).mockImplementation((key: string) => {
        switch (key) {
          case "cors.origin":
            return originRegex;
          default:
            return undefined;
        }
      });

      const corsConfig = corsConfigService.getCorsConfiguration();

      expect(corsConfig.origin).toBe(originRegex);
    });

    it("should handle function origins", () => {
      const originFn = (_origin: string | undefined, callback: Function) => {
        callback(null, true);
      };
      vi.mocked(mockConfigService.get).mockImplementation((key: string) => {
        switch (key) {
          case "cors.origin":
            return originFn;
          default:
            return undefined;
        }
      });

      const corsConfig = corsConfigService.getCorsConfiguration();

      expect(corsConfig.origin).toBe(originFn);
    });

    it("should handle non-standard types and default to wildcard", () => {
      vi.mocked(mockConfigService.get).mockImplementation((key: string) => {
        switch (key) {
          case "cors.origin":
            return { custom: "value" }; // Object that's not a regex
          default:
            return undefined;
        }
      });

      const corsConfig = corsConfigService.getCorsConfiguration();

      expect(corsConfig.origin).toBe("*");
    });

    it("should handle error in configuration and return defaults", () => {
      vi.mocked(mockConfigService.get).mockImplementation(() => {
        throw new Error("Configuration error");
      });

      const corsConfig = corsConfigService.getCorsConfiguration();

      expect(corsConfig.origin).toBe(
        process.env.NODE_ENV === "production" ? false : "*"
      );
      expect(corsConfig.credentials).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith(
        "Error generating CORS configuration",
        expect.objectContaining({ error: expect.any(Error) })
      );
    });

    it("should handle numeric boolean values for credentials", () => {
      vi.mocked(mockConfigService.get).mockImplementation((key: string) => {
        switch (key) {
          case "cors.allowCredentials":
            return 1;
          default:
            return undefined;
        }
      });

      const corsConfig = corsConfigService.getCorsConfiguration();

      expect(corsConfig.credentials).toBe(true);
    });

    it("should handle zero numeric value for credentials as false", () => {
      vi.mocked(mockConfigService.get).mockImplementation((key: string) => {
        switch (key) {
          case "cors.allowCredentials":
            return 0;
          default:
            return undefined;
        }
      });

      const corsConfig = corsConfigService.getCorsConfiguration();

      expect(corsConfig.credentials).toBe(false);
    });

    it("should handle empty origin string and default to wildcard", () => {
      vi.mocked(mockConfigService.get).mockImplementation((key: string) => {
        switch (key) {
          case "cors.origin":
            return "   ";
          default:
            return undefined;
        }
      });

      const corsConfig = corsConfigService.getCorsConfiguration();

      expect(corsConfig.origin).toBe("*");
    });

    it("should properly format string origins with whitespace", () => {
      vi.mocked(mockConfigService.get).mockImplementation((key: string) => {
        switch (key) {
          case "cors.origin":
            return "  http://example.com  ";
          default:
            return undefined;
        }
      });

      const corsConfig = corsConfigService.getCorsConfiguration();

      expect(corsConfig.origin).toBe("http://example.com");
    });

    it("should handle multiple origins with mixed whitespace", () => {
      vi.mocked(mockConfigService.get).mockImplementation((key: string) => {
        switch (key) {
          case "cors.origin":
            return "  http://example.com,   http://localhost:3000 , https://api.example.org ";
          default:
            return undefined;
        }
      });

      const corsConfig = corsConfigService.getCorsConfiguration();

      expect(corsConfig.origin).toEqual([
        "http://example.com",
        "http://localhost:3000",
        "https://api.example.org",
      ]);
    });
  });
});
