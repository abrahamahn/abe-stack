import { describe, it, expect, beforeEach } from "vitest";

import {
  TokenStorage,
  TokenData,
  TokenInfo,
} from "@/server/infrastructure/security/TokenStorageService";

// Mock implementation of TokenStorage
class MockTokenStorage implements TokenStorage {
  private storage: Map<string, TokenData> = new Map();

  async storeToken(tokenId: string, data: TokenData): Promise<void> {
    this.storage.set(tokenId, data);
  }

  async getTokenData(tokenId: string): Promise<TokenData | null> {
    return this.storage.get(tokenId) || null;
  }

  async removeToken(tokenId: string): Promise<void> {
    this.storage.delete(tokenId);
  }

  async hasToken(tokenId: string): Promise<boolean> {
    return this.storage.has(tokenId);
  }

  async getAllUserTokens(userId: string): Promise<TokenInfo[]> {
    return Array.from(this.storage.entries())
      .filter(([_, data]) => data.userId === userId)
      .map(([tokenId, data]) => ({ tokenId, ...data }));
  }

  async removeAllUserTokens(userId: string): Promise<void> {
    for (const [tokenId, data] of this.storage.entries()) {
      if (data.userId === userId) {
        this.storage.delete(tokenId);
      }
    }
  }

  async clearExpiredTokens(): Promise<void> {
    const now = Date.now();
    for (const [tokenId, data] of this.storage.entries()) {
      if (data.createdAt.getTime() + data.expiresIn * 1000 < now) {
        this.storage.delete(tokenId);
      }
    }
  }
}

describe("TokenStorageService", () => {
  let tokenStorage: TokenStorage;

  beforeEach(() => {
    tokenStorage = new MockTokenStorage();
  });

  it("should store and retrieve a token", async () => {
    const tokenId = "token123";
    const data: TokenData = {
      userId: "user123",
      createdAt: new Date(),
      expiresIn: 3600,
    };

    await tokenStorage.storeToken(tokenId, data);
    const retrievedData = await tokenStorage.getTokenData(tokenId);

    expect(retrievedData).toEqual(data);
  });

  it("should remove a token", async () => {
    const tokenId = "token123";
    const data: TokenData = {
      userId: "user123",
      createdAt: new Date(),
      expiresIn: 3600,
    };

    await tokenStorage.storeToken(tokenId, data);
    await tokenStorage.removeToken(tokenId);
    const exists = await tokenStorage.hasToken(tokenId);

    expect(exists).toBe(false);
  });

  it("should list all tokens for a user", async () => {
    const data1: TokenData = {
      userId: "user123",
      createdAt: new Date(),
      expiresIn: 3600,
    };
    const data2: TokenData = {
      userId: "user123",
      createdAt: new Date(),
      expiresIn: 7200,
    };

    await tokenStorage.storeToken("token1", data1);
    await tokenStorage.storeToken("token2", data2);

    const tokens = await tokenStorage.getAllUserTokens("user123");

    expect(tokens).toHaveLength(2);
    expect(tokens.map((t) => t.tokenId)).toContain("token1");
    expect(tokens.map((t) => t.tokenId)).toContain("token2");
  });

  it("should clear expired tokens", async () => {
    const now = new Date();
    const expiredData: TokenData = {
      userId: "user123",
      createdAt: new Date(now.getTime() - 7200 * 1000), // 2 hours ago
      expiresIn: 3600, // 1 hour
    };
    const validData: TokenData = {
      userId: "user123",
      createdAt: now,
      expiresIn: 3600, // 1 hour
    };

    await tokenStorage.storeToken("expiredToken", expiredData);
    await tokenStorage.storeToken("validToken", validData);

    await tokenStorage.clearExpiredTokens();

    const expiredExists = await tokenStorage.hasToken("expiredToken");
    const validExists = await tokenStorage.hasToken("validToken");

    expect(expiredExists).toBe(false);
    expect(validExists).toBe(true);
  });
});
