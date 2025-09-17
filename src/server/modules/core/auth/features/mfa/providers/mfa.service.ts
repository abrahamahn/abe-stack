import * as crypto from "crypto";

import { injectable, inject } from "inversify";

import { TYPES } from "@/server/infrastructure/di/types";
import type { ILoggerService } from "@/server/infrastructure/logging";

/**
 * Native TOTP implementation using Node.js crypto
 */
class NativeTOTP {
  private static readonly DIGITS = 6;
  private static readonly PERIOD = 30; // 30 seconds
  private static readonly ALGORITHM = "sha1";

  /**
   * Generate a random base32 secret
   */
  static generateSecret(length: number = 20): string {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    let secret = "";
    for (let i = 0; i < length; i++) {
      secret += chars[Math.floor(Math.random() * chars.length)];
    }
    return secret;
  }

  /**
   * Convert base32 to buffer
   */
  private static base32ToBuffer(base32: string): Buffer {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    let bits = "";

    for (const char of base32.toUpperCase()) {
      const index = chars.indexOf(char);
      if (index === -1) continue;
      bits += index.toString(2).padStart(5, "0");
    }

    const bytes = [];
    for (let i = 0; i < bits.length; i += 8) {
      const byte = bits.slice(i, i + 8);
      if (byte.length === 8) {
        bytes.push(parseInt(byte, 2));
      }
    }

    return Buffer.from(bytes);
  }

  /**
   * Generate TOTP token
   */
  static generateToken(secret: string, timestamp?: number): string {
    const time = Math.floor((timestamp || Date.now()) / 1000 / this.PERIOD);
    const timeBuffer = Buffer.alloc(8);
    timeBuffer.writeUInt32BE(Math.floor(time / 0x100000000), 0);
    timeBuffer.writeUInt32BE(time & 0xffffffff, 4);

    const secretBuffer = this.base32ToBuffer(secret);
    const hmac = crypto.createHmac(this.ALGORITHM, secretBuffer);
    hmac.update(timeBuffer);
    const hash = hmac.digest();

    const offset = hash[hash.length - 1] & 0x0f;
    const code =
      ((hash[offset] & 0x7f) << 24) |
      ((hash[offset + 1] & 0xff) << 16) |
      ((hash[offset + 2] & 0xff) << 8) |
      (hash[offset + 3] & 0xff);

    return (code % Math.pow(10, this.DIGITS))
      .toString()
      .padStart(this.DIGITS, "0");
  }

  /**
   * Verify TOTP token with time window
   */
  static verifyToken(
    secret: string,
    token: string,
    window: number = 1
  ): boolean {
    const currentTime = Math.floor(Date.now() / 1000);

    for (let i = -window; i <= window; i++) {
      const testTime = currentTime + i * this.PERIOD;
      const expectedToken = this.generateToken(secret, testTime * 1000);
      if (expectedToken === token) {
        return true;
      }
    }

    return false;
  }

  /**
   * Generate QR code URL for manual entry (without actual QR code generation)
   */
  static generateManualEntryUrl(
    secret: string,
    label: string,
    issuer: string = "YourApp"
  ): string {
    return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(label)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}`;
  }
}

/**
 * MFA Service provides multi-factor authentication functionality
 */
@injectable()
export class MfaService {
  constructor(
    @inject(TYPES.LoggerService) private logger: ILoggerService,
    @inject(TYPES.UserRepository) private userRepository: any
  ) {}

  /**
   * Generate a new MFA secret for a user
   */
  async generateMfaSecret(
    userId: string
  ): Promise<{ secret: string; manualEntryKey: string; setupUrl: string }> {
    try {
      // Generate a new secret using our native implementation
      const secret = NativeTOTP.generateSecret(20);

      // Generate setup URL for manual entry
      const setupUrl = NativeTOTP.generateManualEntryUrl(
        secret,
        userId,
        "AbeStack"
      );

      // Update user with secret but don't enable MFA yet
      await this.userRepository.update(userId, {
        mfaSecret: secret,
        mfaEnabled: false,
      });

      return {
        secret: secret,
        manualEntryKey: secret,
        setupUrl: setupUrl,
      };
    } catch (error) {
      this.logger.error("Failed to generate MFA secret", { error, userId });
      throw new Error("Failed to generate MFA secret");
    }
  }

  /**
   * Verify a TOTP token against a user's MFA secret
   */
  async verifyToken(userId: string, token: string): Promise<boolean> {
    try {
      // Get user's MFA secret
      const user = await this.userRepository.findById(userId);
      if (!user || !user.mfaSecret) {
        return false;
      }

      // Verify token using our native implementation
      const verified = NativeTOTP.verifyToken(user.mfaSecret, token, 1);

      return verified;
    } catch (error) {
      this.logger.error("Failed to verify MFA token", { error, userId });
      return false;
    }
  }

  /**
   * Enable MFA for a user after they've verified a token
   */
  async enableMfa(userId: string, token: string): Promise<boolean> {
    try {
      // Verify the token first
      const isValid = await this.verifyToken(userId, token);
      if (!isValid) {
        return false;
      }

      // Update user to enable MFA
      await this.userRepository.update(userId, {
        mfaEnabled: true,
        mfaEnabledAt: new Date(),
      });

      return true;
    } catch (error) {
      this.logger.error("Failed to enable MFA", { error, userId });
      throw new Error("Failed to enable MFA");
    }
  }

  /**
   * Disable MFA for a user
   */
  async disableMfa(userId: string): Promise<boolean> {
    try {
      await this.userRepository.update(userId, {
        mfaEnabled: false,
        mfaSecret: null,
      });

      return true;
    } catch (error) {
      this.logger.error("Failed to disable MFA", { error, userId });
      throw new Error("Failed to disable MFA");
    }
  }

  /**
   * Generate backup codes for a user
   */
  async generateBackupCodes(userId: string): Promise<string[]> {
    try {
      // Generate 10 backup codes
      const backupCodes = Array(10)
        .fill(0)
        .map(() => crypto.randomBytes(4).toString("hex"));

      // Hash the backup codes for storage
      const hashedCodes = backupCodes.map((code) =>
        crypto.createHash("sha256").update(code).digest("hex")
      );

      // Store the hashed codes
      await this.userRepository.update(userId, {
        mfaBackupCodes: hashedCodes,
      });

      // Return the plaintext codes to the user
      return backupCodes;
    } catch (error) {
      this.logger.error("Failed to generate backup codes", { error, userId });
      throw new Error("Failed to generate backup codes");
    }
  }

  /**
   * Verify a backup code
   */
  async verifyBackupCode(userId: string, code: string): Promise<boolean> {
    try {
      const user = await this.userRepository.findById(userId);
      if (!user || !user.mfaBackupCodes || user.mfaBackupCodes.length === 0) {
        return false;
      }

      // Hash the provided code
      const hashedCode = crypto.createHash("sha256").update(code).digest("hex");

      // Check if the code exists in the user's backup codes
      const index = user.mfaBackupCodes.indexOf(hashedCode);
      if (index === -1) {
        return false;
      }

      // Remove the used code
      const updatedCodes = [...user.mfaBackupCodes];
      updatedCodes.splice(index, 1);

      // Update the user's backup codes
      await this.userRepository.update(userId, {
        mfaBackupCodes: updatedCodes,
      });

      return true;
    } catch (error) {
      this.logger.error("Failed to verify backup code", { error, userId });
      return false;
    }
  }

  /**
   * Generate a current TOTP token for testing purposes
   */
  async generateCurrentToken(secret: string): Promise<string> {
    return NativeTOTP.generateToken(secret);
  }
}
