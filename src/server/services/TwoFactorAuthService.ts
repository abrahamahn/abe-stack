import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';
import { User, TwoFactorAuth } from '../models';
import { TwoFactorStatus } from '../models/TwoFactorAuth';
import { Logger } from './LoggerService';
import { NotFoundError, UnauthorizedError } from '../../shared/errors/ApiError';

/**
 * Service for handling two-factor authentication
 */
export class TwoFactorAuthService {
  private static instance: TwoFactorAuthService;
  private logger: Logger;

  private constructor() {
    this.logger = new Logger('TwoFactorAuthService');
  }

  /**
   * Get the singleton instance
   */
  public static getInstance(): TwoFactorAuthService {
    if (!TwoFactorAuthService.instance) {
      TwoFactorAuthService.instance = new TwoFactorAuthService();
    }
    return TwoFactorAuthService.instance;
  }

  /**
   * Generate a new 2FA secret for a user
   * @param user User to generate secret for
   * @returns Secret and QR code data URL
   */
  public async generateSecret(user: User): Promise<{ secret: string; qrCode: string }> {
    try {
      // Generate a new secret
      const secret = speakeasy.generateSecret({
        name: `ABE Stack:${user.email}`,
        length: 20
      });

      // Generate QR code
      const qrCode = await QRCode.toDataURL(secret.otpauth_url || '');

      // Check if user already has 2FA
      let twoFactorAuth = await TwoFactorAuth.findOne({
        where: { userId: user.id }
      });

      // Create or update 2FA record
      if (twoFactorAuth) {
        twoFactorAuth.secret = secret.base32;
        twoFactorAuth.status = TwoFactorStatus.PENDING;
        await twoFactorAuth.save();
      } else {
        twoFactorAuth = await TwoFactorAuth.create({
          userId: user.id,
          secret: secret.base32,
          status: TwoFactorStatus.PENDING,
          backupCodes: []
        });
      }

      return {
        secret: secret.base32,
        qrCode
      };
    } catch (error) {
      this.logger.error('Failed to generate 2FA secret', { error });
      throw new Error('Failed to generate 2FA secret');
    }
  }

  /**
   * Verify a 2FA token
   * @param userId User ID
   * @param token Token to verify
   * @returns True if token is valid
   */
  public async verifyToken(userId: string, token: string): Promise<boolean> {
    try {
      // Get user's 2FA record
      const twoFactorAuth = await TwoFactorAuth.findOne({
        where: { userId }
      });

      if (!twoFactorAuth) {
        throw new NotFoundError('Two-factor authentication not set up');
      }

      // Check if token is a backup code
      if (twoFactorAuth.backupCodes.includes(token)) {
        // Remove used backup code
        twoFactorAuth.backupCodes = twoFactorAuth.backupCodes.filter(code => code !== token);
        twoFactorAuth.lastUsed = new Date();
        await twoFactorAuth.save();
        return true;
      }

      // Verify token
      const verified = speakeasy.totp.verify({
        secret: twoFactorAuth.secret,
        encoding: 'base32',
        token,
        window: 1 // Allow 1 step before/after for clock drift
      });

      if (verified) {
        twoFactorAuth.lastUsed = new Date();
        await twoFactorAuth.save();
      }

      return verified;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      this.logger.error('Failed to verify 2FA token', { error });
      throw new Error('Failed to verify 2FA token');
    }
  }

  /**
   * Enable 2FA for a user
   * @param userId User ID
   * @param token Token to verify
   * @returns Backup codes
   */
  public async enableTwoFactor(userId: string, token: string): Promise<string[]> {
    try {
      // Get user's 2FA record
      const twoFactorAuth = await TwoFactorAuth.findOne({
        where: { userId }
      });

      if (!twoFactorAuth) {
        throw new NotFoundError('Two-factor authentication not set up');
      }

      // Verify token
      const verified = speakeasy.totp.verify({
        secret: twoFactorAuth.secret,
        encoding: 'base32',
        token,
        window: 1
      });

      if (!verified) {
        throw new UnauthorizedError('Invalid verification code');
      }

      // Generate backup codes
      const backupCodes = this.generateBackupCodes();

      // Update 2FA record
      twoFactorAuth.status = TwoFactorStatus.ENABLED;
      twoFactorAuth.backupCodes = backupCodes;
      twoFactorAuth.lastUsed = new Date();
      await twoFactorAuth.save();

      return backupCodes;
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof UnauthorizedError) {
        throw error;
      }
      this.logger.error('Failed to enable 2FA', { error });
      throw new Error('Failed to enable two-factor authentication');
    }
  }

  /**
   * Disable 2FA for a user
   * @param userId User ID
   */
  public async disableTwoFactor(userId: string): Promise<void> {
    try {
      // Get user's 2FA record
      const twoFactorAuth = await TwoFactorAuth.findOne({
        where: { userId }
      });

      if (!twoFactorAuth) {
        throw new NotFoundError('Two-factor authentication not set up');
      }

      // Update 2FA record
      twoFactorAuth.status = TwoFactorStatus.DISABLED;
      twoFactorAuth.backupCodes = [];
      await twoFactorAuth.save();
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      this.logger.error('Failed to disable 2FA', { error });
      throw new Error('Failed to disable two-factor authentication');
    }
  }

  /**
   * Generate new backup codes
   * @param userId User ID
   * @returns New backup codes
   */
  public async regenerateBackupCodes(userId: string): Promise<string[]> {
    try {
      // Get user's 2FA record
      const twoFactorAuth = await TwoFactorAuth.findOne({
        where: { userId }
      });

      if (!twoFactorAuth) {
        throw new NotFoundError('Two-factor authentication not set up');
      }

      if (twoFactorAuth.status !== TwoFactorStatus.ENABLED) {
        throw new Error('Two-factor authentication is not enabled');
      }

      // Generate backup codes
      const backupCodes = this.generateBackupCodes();

      // Update 2FA record
      twoFactorAuth.backupCodes = backupCodes;
      await twoFactorAuth.save();

      return backupCodes;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      this.logger.error('Failed to regenerate backup codes', { error });
      throw new Error('Failed to regenerate backup codes');
    }
  }

  /**
   * Check if 2FA is enabled for a user
   * @param userId User ID
   * @returns 2FA status
   */
  public async getTwoFactorStatus(userId: string): Promise<{ enabled: boolean; status: TwoFactorStatus }> {
    try {
      // Get user's 2FA record
      const twoFactorAuth = await TwoFactorAuth.findOne({
        where: { userId }
      });

      if (!twoFactorAuth) {
        return { enabled: false, status: TwoFactorStatus.DISABLED };
      }

      return {
        enabled: twoFactorAuth.status === TwoFactorStatus.ENABLED,
        status: twoFactorAuth.status
      };
    } catch (error) {
      this.logger.error('Failed to get 2FA status', { error });
      throw new Error('Failed to get two-factor authentication status');
    }
  }

  /**
   * Generate backup codes
   * @returns Array of backup codes
   */
  private generateBackupCodes(): string[] {
    const codes: string[] = [];
    for (let i = 0; i < 10; i++) {
      // Generate a code in format XXXX-XXXX-XXXX
      const code = `${this.generateRandomCode(4)}-${this.generateRandomCode(4)}-${this.generateRandomCode(4)}`;
      codes.push(code);
    }
    return codes;
  }

  /**
   * Generate a random code
   * @param length Length of the code
   * @returns Random code
   */
  private generateRandomCode(length: number): string {
    const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
} 