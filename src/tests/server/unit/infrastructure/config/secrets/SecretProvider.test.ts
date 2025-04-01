import { describe, it, expect, beforeEach } from "vitest";

import { SecretProvider } from "@/server/infrastructure/config/secrets/SecretProvider";

/**
 * Test implementation of SecretProvider
 */
class TestSecretProvider implements SecretProvider {
  private secrets: Map<string, string> = new Map();
  private initialized = false;

  constructor(secrets: Record<string, string> = {}) {
    Object.entries(secrets).forEach(([key, value]) => {
      this.secrets.set(key, value);
    });
  }

  async initialize(): Promise<void> {
    this.initialized = true;
    return Promise.resolve();
  }

  async supportsSecret(key: string): Promise<boolean> {
    return this.secrets.has(key);
  }

  async getSecret(key: string): Promise<string | undefined> {
    return this.secrets.get(key);
  }

  // Helper method to check initialization state
  isInitialized(): boolean {
    return this.initialized;
  }
}

describe("SecretProvider Interface", () => {
  let provider: TestSecretProvider;

  beforeEach(() => {
    provider = new TestSecretProvider({
      API_KEY: "test-api-key",
      DB_PASSWORD: "test-db-password",
    });
  });

  describe("initialize", () => {
    it("should initialize the provider", async () => {
      expect(provider.isInitialized()).toBe(false);
      await provider.initialize();
      expect(provider.isInitialized()).toBe(true);
    });
  });

  describe("supportsSecret", () => {
    it("should return true for supported secrets", async () => {
      expect(await provider.supportsSecret("API_KEY")).toBe(true);
      expect(await provider.supportsSecret("DB_PASSWORD")).toBe(true);
    });

    it("should return false for unsupported secrets", async () => {
      expect(await provider.supportsSecret("UNKNOWN_KEY")).toBe(false);
      expect(await provider.supportsSecret("")).toBe(false);
    });
  });

  describe("getSecret", () => {
    it("should return secret value for supported secrets", async () => {
      expect(await provider.getSecret("API_KEY")).toBe("test-api-key");
      expect(await provider.getSecret("DB_PASSWORD")).toBe("test-db-password");
    });

    it("should return undefined for unsupported secrets", async () => {
      expect(await provider.getSecret("UNKNOWN_KEY")).toBeUndefined();
      expect(await provider.getSecret("")).toBeUndefined();
    });
  });

  describe("interface contract", () => {
    it("should handle empty secret store", async () => {
      const emptyProvider = new TestSecretProvider();

      expect(await emptyProvider.supportsSecret("ANY_KEY")).toBe(false);
      expect(await emptyProvider.getSecret("ANY_KEY")).toBeUndefined();
    });

    it("should handle special characters in keys and values", async () => {
      const specialProvider = new TestSecretProvider({
        "SPECIAL@KEY": "special@value",
        "KEY.WITH.DOTS": "value.with.dots",
        "KEY-WITH-DASHES": "value-with-dashes",
      });

      expect(await specialProvider.supportsSecret("SPECIAL@KEY")).toBe(true);
      expect(await specialProvider.getSecret("SPECIAL@KEY")).toBe(
        "special@value",
      );

      expect(await specialProvider.supportsSecret("KEY.WITH.DOTS")).toBe(true);
      expect(await specialProvider.getSecret("KEY.WITH.DOTS")).toBe(
        "value.with.dots",
      );

      expect(await specialProvider.supportsSecret("KEY-WITH-DASHES")).toBe(
        true,
      );
      expect(await specialProvider.getSecret("KEY-WITH-DASHES")).toBe(
        "value-with-dashes",
      );
    });
  });
});
