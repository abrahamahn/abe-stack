import { describe, it, expect, beforeEach } from "vitest";

import {
  TokenBlacklist,
  TokenMetadata,
  TokenStatus,
} from "@/server/infrastructure/security/TokenBlacklistService";

// Mock implementation of TokenBlacklist
class MockTokenBlacklist implements TokenBlacklist {
  private blacklist: Map<string, TokenMetadata> = new Map();

  async add(tokenId: string, metadata?: TokenMetadata): Promise<boolean> {
    this.blacklist.set(tokenId, metadata || {});
    return true;
  }

  async remove(tokenId: string): Promise<boolean> {
    return this.blacklist.delete(tokenId);
  }

  async check(tokenId: string): Promise<TokenStatus> {
    const metadata = this.blacklist.get(tokenId);
    return { isBlacklisted: !!metadata, metadata };
  }

  async getMetadata(tokenId: string): Promise<TokenMetadata | null> {
    return this.blacklist.get(tokenId) || null;
  }

  async listAll(): Promise<string[]> {
    return Array.from(this.blacklist.keys());
  }
}

describe("TokenBlacklistService", () => {
  let tokenBlacklist: TokenBlacklist;

  beforeEach(() => {
    tokenBlacklist = new MockTokenBlacklist();
  });

  it("should add a token to the blacklist", async () => {
    const tokenId = "token123";
    const metadata: TokenMetadata = { userId: "user123", reason: "test" };

    const result = await tokenBlacklist.add(tokenId, metadata);
    expect(result).toBe(true);

    const status = await tokenBlacklist.check(tokenId);
    expect(status.isBlacklisted).toBe(true);
    expect(status.metadata).toEqual(metadata);
  });

  it("should remove a token from the blacklist", async () => {
    const tokenId = "token123";
    await tokenBlacklist.add(tokenId);

    const result = await tokenBlacklist.remove(tokenId);
    expect(result).toBe(true);

    const status = await tokenBlacklist.check(tokenId);
    expect(status.isBlacklisted).toBe(false);
  });

  it("should list all blacklisted tokens", async () => {
    await tokenBlacklist.add("token1");
    await tokenBlacklist.add("token2");

    const tokens = await tokenBlacklist.listAll();
    expect(tokens).toContain("token1");
    expect(tokens).toContain("token2");
    expect(tokens.length).toBe(2);
  });

  it("should get metadata for a blacklisted token", async () => {
    const tokenId = "token123";
    const metadata: TokenMetadata = { userId: "user123", reason: "test" };
    await tokenBlacklist.add(tokenId, metadata);

    const result = await tokenBlacklist.getMetadata(tokenId);
    expect(result).toEqual(metadata);
  });

  it("should return null metadata for a non-existent token", async () => {
    const result = await tokenBlacklist.getMetadata("nonexistent-token");
    expect(result).toBeNull();
  });

  it("should handle complex metadata", async () => {
    const tokenId = "token123";
    const now = new Date();
    const metadata: TokenMetadata = {
      userId: "user123",
      reason: "security violation",
      addedAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + 3600000), // 1 hour later
      device: "iPhone",
      ipAddress: "192.168.1.1",
      customField: "custom value",
      severity: 5,
    };

    await tokenBlacklist.add(tokenId, metadata);

    const result = await tokenBlacklist.getMetadata(tokenId);
    expect(result).toEqual(metadata);
    expect(result?.userId).toBe("user123");
    expect(result?.device).toBe("iPhone");
    expect(result?.customField).toBe("custom value");
  });

  it("should return false for removing non-existent token", async () => {
    const result = await tokenBlacklist.remove("nonexistent-token");
    expect(result).toBe(false);
  });

  it("should correctly check if a token is not blacklisted", async () => {
    const status = await tokenBlacklist.check("nonexistent-token");
    expect(status.isBlacklisted).toBe(false);
    expect(status.metadata).toBeUndefined();
  });

  it("should return an empty array when no tokens are blacklisted", async () => {
    const tokens = await tokenBlacklist.listAll();
    expect(tokens).toEqual([]);
    expect(tokens.length).toBe(0);
  });
});
