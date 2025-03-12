import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';
import { User } from '../models';
import { TwoFactorAuthRepository, twoFactorAuthRepository } from '../models/TwoFactorAuth';
import { TwoFactorStatus } from '../models/TwoFactorAuth';
import { Logger } from './LoggerService';
import { NotFoundError, UnauthorizedError } from '../../shared/errors/ApiError';

/**
 * Service for handling two-factor authentication
 */
export class TwoFactorAuthService {
  private static instance: TwoFactorAuthService;
  private repository: TwoFactorAuthRepository;
  private logger: Logger;

  private constructor() {
    this.repository = twoFactorAuthRepository;
    this.logger = new Logger('TwoFactorAuthService');
  }

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
      const secret = speakeasy.generateSecret({
        name: `ABE Stack:${user.email}`,
        length: 20
      });

      const qrCode = await QRCode.toDataURL(secret.otpauth_url || '');

      const existingAuth = await this.repository.findByUserId(user.id);

      if (existingAuth) {
        await this.repository.update(existingAuth.id, {
          secret: secret.base32,
          status: TwoFactorStatus.PENDING
        });
      } else {
        await this.repository.create({
          userId: user.id,
          secret: secret.base32,
          status: TwoFactorStatus.PENDING,
          backupCodes: [],
          lastUsed: null
        });
      }

      return { secret: secret.base32, qrCode };
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
      const twoFactorAuth = await this.repository.findByUserId(userId);

      if (!twoFactorAuth) {
        throw new NotFoundError('Two-factor authentication not set up');
      }

      if (twoFactorAuth.backupCodes.includes(token)) {
        const updatedCodes = twoFactorAuth.backupCodes.filter(code => code !== token);
        await this.repository.update(twoFactorAuth.id, {
          backupCodes: updatedCodes,
          lastUsed: new Date()
        });
        return true;
      }

      const verified = speakeasy.totp.verify({
        secret: twoFactorAuth.secret,
        encoding: 'base32',
        token,
        window: 1
      });

      if (verified) {
        await this.repository.update(twoFactorAuth.id, {
          lastUsed: new Date()
        });
      }

      return verified;
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
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
      const twoFactorAuth = await this.repository.findByUserId(userId);

      if (!twoFactorAuth) {
        throw new NotFoundError('Two-factor authentication not set up');
      }

      const verified = speakeasy.totp.verify({
        secret: twoFactorAuth.secret,
        encoding: 'base32',
        token,
        window: 1
      });

      if (!verified) {
        throw new UnauthorizedError('Invalid verification code');
      }

      const backupCodes = this.generateBackupCodes();

      await this.repository.update(twoFactorAuth.id, {
        status: TwoFactorStatus.ENABLED,
        backupCodes,
        lastUsed: new Date()
      });

      return backupCodes;
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof UnauthorizedError) throw error;
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
      const twoFactorAuth = await this.repository.findByUserId(userId);

      if (!twoFactorAuth) {
        throw new NotFoundError('Two-factor authentication not set up');
      }

      await this.repository.update(twoFactorAuth.id, {
        status: TwoFactorStatus.DISABLED,
        backupCodes: []
      });
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
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
      const twoFactorAuth = await this.repository.findByUserId(userId);

      if (!twoFactorAuth) {
        throw new NotFoundError('Two-factor authentication not set up');
      }

      if (twoFactorAuth.status !== TwoFactorStatus.ENABLED) {
        throw new Error('Two-factor authentication is not enabled');
      }

      const backupCodes = this.generateBackupCodes();

      await this.repository.update(twoFactorAuth.id, {
        backupCodes
      });

      return backupCodes;
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
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
      const twoFactorAuth = await this.repository.findByUserId(userId);

      if (!twoFactorAuth) {
        return { enabled: false, status: TwoFactorStatus.DISABLED };
      }

      return {
        enabled: twoFactorAuth.status === TwoFactorStatus.ENABLED,
        status: twoFactorAuth.status as TwoFactorStatus
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