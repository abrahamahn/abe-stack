import { describe, it, expect } from "vitest";

import {
  TokenType,
  TokenOptions,
  TokenPayload,
  TokenValidationResult,
  TokenPair,
  TokenRevocationReason,
  TokenMetadata,
  TokenUtils,
} from "@/server/infrastructure/security/tokenTypes";

describe("tokenTypes", () => {
  describe("TokenType", () => {
    it("should have correct TokenType values", () => {
      expect(TokenType.ACCESS).toBe("access");
      expect(TokenType.REFRESH).toBe("refresh");
      expect(TokenType.PASSWORD_RESET).toBe("password_reset");
      expect(TokenType.EMAIL_VERIFICATION).toBe("email_verification");
      expect(TokenType.TEMP).toBe("temp");
      expect(TokenType.API_KEY).toBe("api_key");
      expect(TokenType.SSO).toBe("sso");
      expect(TokenType.PASSWORDLESS).toBe("passwordless");
    });

    it("should allow TokenType to be used as string keys", () => {
      const tokenMap: Record<TokenType, string> = {
        [TokenType.ACCESS]: "Access Token",
        [TokenType.REFRESH]: "Refresh Token",
        [TokenType.PASSWORD_RESET]: "Password Reset Token",
        [TokenType.EMAIL_VERIFICATION]: "Email Verification Token",
        [TokenType.TEMP]: "Temporary Token",
        [TokenType.API_KEY]: "API Key Token",
        [TokenType.SSO]: "Single Sign-On Token",
        [TokenType.PASSWORDLESS]: "Passwordless Token",
      };

      expect(tokenMap[TokenType.ACCESS]).toBe("Access Token");
      expect(tokenMap[TokenType.REFRESH]).toBe("Refresh Token");
    });
  });

  describe("TokenOptions", () => {
    it("should create a valid TokenOptions object with basic properties", () => {
      const options: TokenOptions = {
        expiresIn: "1h",
        audience: "test-audience",
        issuer: "test-issuer",
      };

      expect(options.expiresIn).toBe("1h");
      expect(options.audience).toBe("test-audience");
      expect(options.issuer).toBe("test-issuer");
    });

    it("should allow TokenOptions with advanced properties", () => {
      const options: TokenOptions = {
        expiresIn: 3600,
        audience: ["web", "mobile"],
        issuer: "auth.example.com",
        subject: "user123",
        jwtid: "unique-jwt-id",
        notBefore: "30s",
        algorithm: "HS256",
      };

      expect(options.expiresIn).toBe(3600);
      expect(options.audience).toEqual(["web", "mobile"]);
      expect(options.issuer).toBe("auth.example.com");
      expect(options.subject).toBe("user123");
      expect(options.jwtid).toBe("unique-jwt-id");
      expect(options.notBefore).toBe("30s");
      expect(options.algorithm).toBe("HS256");
    });
  });

  describe("TokenPayload", () => {
    it("should create a valid TokenPayload object with basic properties", () => {
      const payload: TokenPayload = {
        userId: "user123",
        email: "user@example.com",
        roles: ["admin"],
        sessionId: "session123",
        tokenId: "token123",
        type: "access",
        deviceInfo: {
          ip: "127.0.0.1",
          userAgent: "Mozilla/5.0",
        },
      };

      expect(payload.userId).toBe("user123");
      expect(payload.email).toBe("user@example.com");
      expect(payload.roles).toContain("admin");
      expect(payload.sessionId).toBe("session123");
      expect(payload.tokenId).toBe("token123");
      expect(payload.type).toBe("access");
      expect(payload.deviceInfo?.ip).toBe("127.0.0.1");
      expect(payload.deviceInfo?.userAgent).toBe("Mozilla/5.0");
    });

    it("should allow TokenPayload with extended properties", () => {
      const now = Math.floor(Date.now() / 1000);
      const payload: TokenPayload = {
        userId: "user123",
        email: "user@example.com",
        roles: ["user", "editor"],
        type: "access",
        deviceInfo: {
          ip: "192.168.1.1",
          userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)",
          deviceId: "iphone12-abc123",
          platform: "ios",
        },
        issuedAt: now,
        expiresAt: now + 3600,
        metadata: {
          lastLogin: now - 86400,
          twoFactorEnabled: true,
        },
      };

      expect(payload.deviceInfo?.deviceId).toBe("iphone12-abc123");
      expect(payload.deviceInfo?.platform).toBe("ios");
      expect(payload.issuedAt).toBe(now);
      expect(payload.expiresAt).toBe(now + 3600);
      expect(payload.metadata?.lastLogin).toBe(now - 86400);
      expect(payload.metadata?.twoFactorEnabled).toBe(true);
    });
  });

  describe("TokenPair", () => {
    it("should create a valid TokenPair object with required properties", () => {
      const tokenPair: TokenPair = {
        accessToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
        refreshToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
        expiresIn: 3600,
      };

      expect(tokenPair.accessToken).toBeDefined();
      expect(tokenPair.refreshToken).toBeDefined();
      expect(tokenPair.expiresIn).toBe(3600);
    });

    it("should allow TokenPair with optional properties", () => {
      const now = Math.floor(Date.now() / 1000);
      const tokenPair: TokenPair = {
        accessToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
        refreshToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
        expiresIn: 3600,
        issuedAt: now,
        tokenType: "Bearer",
      };

      expect(tokenPair.issuedAt).toBe(now);
      expect(tokenPair.tokenType).toBe("Bearer");
    });
  });

  describe("TokenValidationResult", () => {
    it("should create a valid TokenValidationResult object for successful validation", () => {
      const validationResult: TokenValidationResult = {
        valid: true,
        payload: {
          userId: "user123",
        },
        expiresIn: 3600,
      };

      expect(validationResult.valid).toBe(true);
      expect(validationResult.payload?.userId).toBe("user123");
      expect(validationResult.error).toBeUndefined();
      expect(validationResult.expiresIn).toBe(3600);
    });

    it("should create a valid TokenValidationResult object for failed validation", () => {
      const validationResult: TokenValidationResult = {
        valid: false,
        error: "Token has expired",
        errorCode: "token_expired",
      };

      expect(validationResult.valid).toBe(false);
      expect(validationResult.error).toBe("Token has expired");
      expect(validationResult.errorCode).toBe("token_expired");
      expect(validationResult.payload).toBeUndefined();
    });
  });

  describe("TokenRevocationReason", () => {
    it("should have correct TokenRevocationReason values", () => {
      expect(TokenRevocationReason.LOGOUT).toBe("logout");
      expect(TokenRevocationReason.SECURITY_BREACH).toBe("security_breach");
      expect(TokenRevocationReason.CREDENTIALS_CHANGED).toBe(
        "credentials_changed"
      );
      expect(TokenRevocationReason.ACCOUNT_DISABLED).toBe("account_disabled");
      expect(TokenRevocationReason.ADMIN_REVOKED).toBe("admin_revoked");
      expect(TokenRevocationReason.SUSPICIOUS_ACTIVITY).toBe(
        "suspicious_activity"
      );
    });

    it("should allow using TokenRevocationReason for metadata", () => {
      const metadata = {
        reason: TokenRevocationReason.CREDENTIALS_CHANGED,
        timestamp: Date.now(),
      };

      expect(metadata.reason).toBe("credentials_changed");
    });
  });

  describe("TokenMetadata", () => {
    it("should create a valid TokenMetadata object", () => {
      const metadata: TokenMetadata = {
        userInfo: {
          name: "John Doe",
          orgId: "org123",
        },
        ipAddress: "192.168.1.1",
        userAgent: "Mozilla/5.0",
        device: "iPhone 12",
        geo: {
          country: "US",
          region: "CA",
          city: "San Francisco",
        },
        purpose: "api_access",
        scope: ["read:users", "write:users"],
      };

      expect(metadata.userInfo?.name).toBe("John Doe");
      expect(metadata.ipAddress).toBe("192.168.1.1");
      expect(metadata.geo?.country).toBe("US");
      expect(metadata.scope).toContain("read:users");
      expect(metadata.purpose).toBe("api_access");
    });

    it("should allow optional properties in TokenMetadata", () => {
      const metadata: TokenMetadata = {
        ipAddress: "192.168.1.1",
        userAgent: "Mozilla/5.0",
      };

      expect(metadata.ipAddress).toBe("192.168.1.1");
      expect(metadata.userAgent).toBe("Mozilla/5.0");
      expect(metadata.geo).toBeUndefined();
      expect(metadata.scope).toBeUndefined();
    });
  });

  describe("TokenUtils", () => {
    it("should format a token pair correctly", () => {
      const accessToken = "access-token-value";
      const refreshToken = "refresh-token-value";
      const expiresIn = 7200;

      const tokenPair = TokenUtils.formatTokenPair(
        accessToken,
        refreshToken,
        expiresIn
      );

      expect(tokenPair.accessToken).toBe(accessToken);
      expect(tokenPair.refreshToken).toBe(refreshToken);
      expect(tokenPair.expiresIn).toBe(expiresIn);
      expect(tokenPair.issuedAt).toBeDefined();
      expect(tokenPair.tokenType).toBe("Bearer");
    });

    it("should format a token pair with default expiration", () => {
      const accessToken = "access-token-value";
      const refreshToken = "refresh-token-value";

      const tokenPair = TokenUtils.formatTokenPair(accessToken, refreshToken);

      expect(tokenPair.accessToken).toBe(accessToken);
      expect(tokenPair.refreshToken).toBe(refreshToken);
      expect(tokenPair.expiresIn).toBe(3600); // Default value
    });

    it("should extract token from valid authorization header", () => {
      const token = "valid-token-value";
      const authHeader = `Bearer ${token}`;

      const extractedToken = TokenUtils.extractTokenFromHeader(authHeader);

      expect(extractedToken).toBe(token);
    });

    it("should return null for invalid authorization header", () => {
      expect(TokenUtils.extractTokenFromHeader(undefined)).toBeNull();
      expect(TokenUtils.extractTokenFromHeader("")).toBeNull();
      expect(
        TokenUtils.extractTokenFromHeader("Basic dXNlcjpwYXNz")
      ).toBeNull();
      expect(TokenUtils.extractTokenFromHeader("Bearer")).toBeNull();
      expect(
        TokenUtils.extractTokenFromHeader("Bearer token extra")
      ).toBeNull();
    });

    it("should create a basic payload with default values", () => {
      const userId = "user123";

      const payload = TokenUtils.createBasicPayload(userId);

      expect(payload.userId).toBe(userId);
      expect(payload.roles).toEqual([]);
      expect(payload.type).toBe("access");
      expect(payload.issuedAt).toBeDefined();
      expect(payload.expiresAt).toBeDefined();
      expect(payload.expiresAt! - payload.issuedAt!).toBe(3600);
    });

    it("should create a basic payload with custom values", () => {
      const userId = "user123";
      const roles = ["admin", "editor"];
      const type = "refresh";
      const expiresIn = 86400;

      const payload = TokenUtils.createBasicPayload(
        userId,
        roles,
        type,
        expiresIn
      );

      expect(payload.userId).toBe(userId);
      expect(payload.roles).toEqual(roles);
      expect(payload.type).toBe(type);
      expect(payload.issuedAt).toBeDefined();
      expect(payload.expiresAt).toBeDefined();
      expect(payload.expiresAt! - payload.issuedAt!).toBe(expiresIn);
    });

    it("should correctly determine if a token is expired", () => {
      const now = Math.floor(Date.now() / 1000);

      // Expired payload
      const expiredPayload: TokenPayload = {
        userId: "user123",
        expiresAt: now - 100,
      };

      // Valid payload
      const validPayload: TokenPayload = {
        userId: "user123",
        expiresAt: now + 3600,
      };

      // Payload without expiration
      const noExpirationPayload: TokenPayload = {
        userId: "user123",
      };

      expect(TokenUtils.isTokenExpired(expiredPayload)).toBe(true);
      expect(TokenUtils.isTokenExpired(validPayload)).toBe(false);
      expect(TokenUtils.isTokenExpired(noExpirationPayload)).toBe(false);
    });

    it("should respect buffer time when checking expiration", () => {
      const now = Math.floor(Date.now() / 1000);

      // Payload that will expire soon
      const expiringPayload: TokenPayload = {
        userId: "user123",
        expiresAt: now + 50,
      };

      // Check with 100 second buffer
      expect(TokenUtils.isTokenExpired(expiringPayload, 100)).toBe(true);

      // Check with 10 second buffer
      expect(TokenUtils.isTokenExpired(expiringPayload, 10)).toBe(false);
    });
  });
});
