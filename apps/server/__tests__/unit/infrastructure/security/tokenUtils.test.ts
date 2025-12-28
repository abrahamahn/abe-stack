import { describe, it, expect } from "vitest";

import { TokenType } from "@/server/infrastructure/security/tokenTypes";
import * as tokenUtils from "@/server/infrastructure/security/tokenUtils";

describe("tokenUtils", () => {
  it("should have correct default token expiration values", () => {
    expect(tokenUtils.DEFAULT_TOKEN_EXPIRATION[TokenType.ACCESS]).toBe(3600);
    expect(tokenUtils.DEFAULT_TOKEN_EXPIRATION[TokenType.REFRESH]).toBe(
      2592000
    );
    expect(tokenUtils.DEFAULT_TOKEN_EXPIRATION[TokenType.PASSWORD_RESET]).toBe(
      3600
    );
    expect(
      tokenUtils.DEFAULT_TOKEN_EXPIRATION[TokenType.EMAIL_VERIFICATION]
    ).toBe(86400);
    expect(tokenUtils.DEFAULT_TOKEN_EXPIRATION[TokenType.TEMP]).toBe(600);
    expect(tokenUtils.DEFAULT_TOKEN_EXPIRATION[TokenType.API_KEY]).toBe(
      31536000
    );
    expect(tokenUtils.DEFAULT_TOKEN_EXPIRATION[TokenType.SSO]).toBe(43200);
    expect(tokenUtils.DEFAULT_TOKEN_EXPIRATION[TokenType.PASSWORDLESS]).toBe(
      900
    );
  });

  it("should create a token ID from a token string", () => {
    const token = "abcdefghijklmnopqrstuvwxyz123456";
    const tokenId = tokenUtils.createTokenId(token);

    expect(tokenId).toBe("abcdefghijklmnop");
  });

  it("should create a token ID with custom length", () => {
    const token = "abcdefghijklmnopqrstuvwxyz123456";
    const tokenId = tokenUtils.createTokenId(token, 8);

    expect(tokenId).toBe("abcdefgh");
  });

  it("should revoke a token successfully", async () => {
    const token = "token-to-revoke";
    const result = await tokenUtils.revokeToken(token);

    expect(result).toBe(true);
  });

  it("should generate a secure token", () => {
    const token = tokenUtils.generateSecureToken();
    expect(typeof token).toBe("string");
    expect(token.length).toBe(64); // 32 bytes = 64 hex chars
  });

  it("should get token expiration for a type", () => {
    expect(tokenUtils.getTokenExpiration(TokenType.ACCESS)).toBe(3600);
    expect(tokenUtils.getTokenExpiration(TokenType.ACCESS, 7200)).toBe(7200);
  });

  it("should extract token from authorization header", () => {
    const token = "valid-token";
    expect(tokenUtils.extractTokenFromHeader(`Bearer ${token}`)).toBe(token);
    expect(tokenUtils.extractTokenFromHeader("Basic auth")).toBeNull();
  });

  it("should check if token is expired", () => {
    const now = Math.floor(Date.now() / 1000);
    expect(tokenUtils.isTokenExpired({ exp: now - 100 })).toBe(true);
    expect(tokenUtils.isTokenExpired({ exp: now + 100 })).toBe(false);
  });

  it("should hash a token", () => {
    const token = "test-token";
    const hashedToken = tokenUtils.hashToken(token);
    expect(typeof hashedToken).toBe("string");
    expect(hashedToken.length).toBe(64); // SHA-256 outputs 32 bytes = 64 hex chars
  });
});
