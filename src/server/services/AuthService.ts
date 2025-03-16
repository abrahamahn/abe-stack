import crypto from 'crypto';

import bcrypt from 'bcrypt';
import * as QRCode from 'qrcode';
import * as speakeasy from 'speakeasy';

import { UnauthorizedError } from '../errors/UnauthorizedError';
import { NotFoundError } from '../middleware/error';
import { TwoFactorAuthRepository, twoFactorAuthRepository, TwoFactorStatus } from '../models/TwoFactorAuth';
import { User, UserAttributes } from '../models/User';

import { AuthTokenService, TokenType } from './AuthTokenService';
import { Database } from './Database';
import { EmailService } from './EmailService';
import { Logger } from './LoggerService';

// Auth interfaces
interface RegisterArgs {
  username: string;
  email: string;
  password: string;
  displayName: string;
  firstName: string;
  lastName: string;
}

interface LoginArgs {
  email: string;
  password: string;
}

interface AuthResult {
  token: string;
  refreshToken: string;
  user: UserAttributes;
  requires2FA?: boolean;
}

/**
 * Consolidated authentication service that handles:
 * - User registration and login
 * - Password management
 * - Email verification
 * - Two-factor authentication (2FA)
 * - Token management (via AuthTokenService)
 */
export class AuthService {
  private emailService: EmailService;
  private logger: Logger;
  private tokenService: AuthTokenService;
  private db: Database;
  private twoFactorAuthRepo: TwoFactorAuthRepository;
  private static instance: AuthService;

  private constructor() {
    this.db = new Database(process.env.DB_PATH || './db');
    void this.initializeDatabase();
    this.emailService = new EmailService(this.db);
    this.logger = new Logger('AuthService');
    this.tokenService = AuthTokenService.getInstance();
    this.twoFactorAuthRepo = twoFactorAuthRepository;
  }

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  // Initialize the database connection if not already connected
  private async initializeDatabase() {
    try {
      await this.db.initialize();
      console.log('Database initialized successfully in AuthService');
    } catch (error) {
      console.error('Failed to initialize database in AuthService:', error);
      throw new Error('Database connection not initialized');
    }
  }

  /**
   * Register a new user
   */
  async register(args: RegisterArgs): Promise<AuthResult> {
    this.logger.info('Attempting to register new user', { email: args.email });
    
    // Check if user already exists
    const existingUser = await User.findByEmail(args.email);
    if (existingUser) {
      this.logger.warn('Registration attempt with existing email', { email: args.email });
      // If user exists but email is not confirmed, resend confirmation email
      if (existingUser && !existingUser.emailConfirmed) {
        await this.resendConfirmationEmail(existingUser.email);
        return this.generateAuthResult(existingUser);
      }
      throw new Error('User already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(args.password, 10);

    // Generate confirmation token
    const confirmationToken = crypto.randomBytes(32).toString('hex');
    const tokenExpiry = new Date();
    tokenExpiry.setHours(tokenExpiry.getHours() + 24); // Token expires in 24 hours

    // Create user
    const user = await this.createUser(args, hashedPassword, confirmationToken, tokenExpiry);

    // Send confirmation email
    await this.emailService.sendConfirmationEmail(user.email, confirmationToken);

    return this.generateAuthResult(user);
  }

  /**
   * Login a user
   */
  async login(args: LoginArgs): Promise<AuthResult> {
    this.logger.info('Login attempt', { email: args.email });
    
    const user = await User.findByEmail(args.email) as User;
    if (!user) {
      this.logger.warn('Login failed - user not found', { email: args.email });
      throw new UnauthorizedError('Invalid credentials');
    }

    const validPassword = await bcrypt.compare(args.password, user.password);
    if (!validPassword) {
      this.logger.warn('Login failed - invalid password', { email: args.email });
      throw new UnauthorizedError('Invalid credentials');
    }

    // Check if email is confirmed
    if (!user.emailConfirmed) {
      await this.resendConfirmationEmail(user.email);
      throw new UnauthorizedError('Please confirm your email address. A new confirmation email has been sent.');
    }

    // Check if 2FA is enabled
    const twoFactorStatus = await this.getTwoFactorStatus(user.id);
    if (twoFactorStatus.enabled) {
      return {
        ...this.generateAuthResult(user),
        requires2FA: true
      };
    }

    return this.generateAuthResult(user);
  }

  /**
   * Confirm a user's email
   */
  async confirmEmail(token: string): Promise<boolean> {
    const pool = this.db.getPool();
    if (!pool) {
      throw new Error('Database connection not available');
    }
    
    const result = await pool.query<{ id: string }>(
      'SELECT id FROM users WHERE email_token = $1 AND email_token_expire > NOW()',
      [token]
    );

    if (result.rows.length === 0) {
      throw new Error('Invalid or expired token');
    }

    const userId = result.rows[0].id;
    await pool.query(
      'UPDATE users SET email_confirmed = TRUE, email_token = NULL, email_token_expire = NULL WHERE id = $1',
      [userId]
    );

    return true;
  }

  /**
   * Resend confirmation email
   */
  async resendConfirmationEmail(email: string): Promise<boolean> {
    const user = await User.findByEmail(email);
    if (!user) {
      throw new Error('User not found');
    }

    if (user.emailConfirmed) {
      throw new Error('Email already confirmed');
    }

    // Check if last email was sent less than 1 minute ago
    if (user.lastEmailSent) {
      const lastSent = new Date(user.lastEmailSent);
      const now = new Date();
      const diffInMinutes = (now.getTime() - lastSent.getTime()) / (1000 * 60);
      
      if (diffInMinutes < 1) {
        throw new Error('Please wait before requesting another email');
      }
    }

    // Generate new confirmation token
    const confirmationToken = crypto.randomBytes(32).toString('hex');
    const tokenExpiry = new Date();
    tokenExpiry.setHours(tokenExpiry.getHours() + 24);

    const pool = this.db.getPool();
    if (!pool) {
      throw new Error('Database connection not available');
    }
    
    await pool.query(
      'UPDATE users SET email_token = $1, email_token_expire = $2 WHERE id = $3',
      [confirmationToken, tokenExpiry, user.id]
    );

    await this.emailService.sendConfirmationEmail(user.email, confirmationToken);
    return true;
  }

  /**
   * Get the current user from a token
   */
  async getCurrentUser(token: string): Promise<User> {
    try {
      const decoded = this.tokenService.verifyAccessToken(token);
      const user = await User.findByPk(decoded.userId) as User;
      
      if (!user) {
        throw new UnauthorizedError('User not found');
      }

      return user;
    } catch (error) {
      throw new UnauthorizedError('Invalid token');
    }
  }

  /**
   * Refresh an access token using a refresh token
   */
  async refreshToken(refreshTokenStr: string): Promise<{ token: string; refreshToken: string }> {
    try {
      const decoded = this.tokenService.verifyRefreshToken(refreshTokenStr);
      const user = await User.findByPk(decoded.userId) as User;

      if (!user) {
        throw new UnauthorizedError('User not found');
      }

      const { accessToken, refreshToken } = this.generateTokens(user);
      return { token: accessToken, refreshToken };
    } catch (error) {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }
  }

  /**
   * Logout a user by blacklisting their tokens
   */
  logout(token: string): boolean {
    try {
      const decoded = this.tokenService.verifyAccessToken(token);
      if (decoded.exp) {
        const remainingTime = decoded.exp - Math.floor(Date.now() / 1000);
        if (remainingTime > 0) {
          this.tokenService.blacklistToken(token, TokenType.ACCESS);
        }
      }
      return true;
    } catch (error) {
      console.error('Error during logout:', error);
      return false;
    }
  }

  // Two-Factor Authentication Methods

  /**
   * Generate a new 2FA secret for a user
   */
  async generate2FASecret(user: UserAttributes): Promise<{ secret: string; qrCode: string }> {
    try {
      const secret = speakeasy.generateSecret({
        name: `ABE Stack:${user.email}`,
        length: 20
      });

      const qrCode = await QRCode.toDataURL(secret.otpauth_url || '');
      const existingAuth = await this.twoFactorAuthRepo.findByUserId(user.id);

      if (existingAuth) {
        await this.twoFactorAuthRepo.update(existingAuth.id, {
          secret: secret.base32,
          status: TwoFactorStatus.PENDING
        });
      } else {
        await this.twoFactorAuthRepo.create({
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
   */
  async verify2FAToken(userId: string, token: string): Promise<boolean> {
    try {
      const twoFactorAuth = await this.twoFactorAuthRepo.findByUserId(userId);

      if (!twoFactorAuth) {
        throw new NotFoundError('Two-factor authentication not set up');
      }

      if (twoFactorAuth.backupCodes.includes(token)) {
        const updatedCodes = twoFactorAuth.backupCodes.filter(code => code !== token);
        await this.twoFactorAuthRepo.update(twoFactorAuth.id, {
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
        await this.twoFactorAuthRepo.update(twoFactorAuth.id, {
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
   */
  async enable2FA(userId: string, token: string): Promise<string[]> {
    try {
      const twoFactorAuth = await this.twoFactorAuthRepo.findByUserId(userId);

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

      await this.twoFactorAuthRepo.update(twoFactorAuth.id, {
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
   */
  async disable2FA(userId: string): Promise<void> {
    try {
      const twoFactorAuth = await this.twoFactorAuthRepo.findByUserId(userId);

      if (!twoFactorAuth) {
        throw new NotFoundError('Two-factor authentication not set up');
      }

      await this.twoFactorAuthRepo.update(twoFactorAuth.id, {
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
   * Regenerate backup codes for 2FA
   */
  async regenerate2FABackupCodes(userId: string): Promise<string[]> {
    try {
      const twoFactorAuth = await this.twoFactorAuthRepo.findByUserId(userId);

      if (!twoFactorAuth) {
        throw new NotFoundError('Two-factor authentication not set up');
      }

      if ((twoFactorAuth.status as TwoFactorStatus) !== TwoFactorStatus.ENABLED) {
        throw new Error('Two-factor authentication is not enabled');
      }

      const backupCodes = this.generateBackupCodes();

      await this.twoFactorAuthRepo.update(twoFactorAuth.id, {
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
   * Get 2FA status for a user
   */
  async getTwoFactorStatus(userId: string): Promise<{ enabled: boolean; status: TwoFactorStatus }> {
    try {
      const twoFactorAuth = await this.twoFactorAuthRepo.findByUserId(userId);

      if (!twoFactorAuth) {
        return { enabled: false, status: TwoFactorStatus.DISABLED };
      }

      return {
        enabled: (twoFactorAuth.status as TwoFactorStatus) === TwoFactorStatus.ENABLED,
        status: twoFactorAuth.status as TwoFactorStatus
      };
    } catch (error) {
      this.logger.error('Failed to get 2FA status', { error });
      throw new Error('Failed to get two-factor authentication status');
    }
  }

  // Private helper methods

  private async createUser(
    args: RegisterArgs,
    hashedPassword: string,
    confirmationToken: string,
    tokenExpiry: Date
  ): Promise<User> {
    if (this.db.isInMemoryMode && this.db.isInMemoryMode()) {
      return this.createUserInMemory(args, hashedPassword, confirmationToken, tokenExpiry);
    }
    return this.createUserInDatabase(args, hashedPassword, confirmationToken, tokenExpiry);
  }

  private async createUserInMemory(
    args: RegisterArgs,
    hashedPassword: string,
    confirmationToken: string,
    tokenExpiry: Date
  ): Promise<User> {
    const userId = crypto.randomUUID();
    const userData = {
      id: userId,
      username: args.username,
      email: args.email,
      password: hashedPassword,
      displayName: args.displayName,
      firstName: args.firstName,
      lastName: args.lastName,
      bio: '',
      profileImage: '',
      bannerImage: '',
      role: 'user',
      isVerified: false,
      emailConfirmed: false,
      emailToken: confirmationToken,
      emailTokenExpire: tokenExpiry,
      lastEmailSent: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const pool = this.db.getPool();
    if (pool) {
      await pool.query(
        'INSERT INTO users (id, username, email, password, display_name, first_name, last_name, bio, profile_image, banner_image, role, is_verified, email_confirmed, email_token, email_token_expire, last_email_sent) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)',
        [userId, args.username, args.email, hashedPassword, args.displayName, args.firstName, args.lastName, '', '', '', 'user', false, false, confirmationToken, tokenExpiry, new Date()]
      );
    }
    
    const user = await User.findByPk(userId) as User;
    return user || new User(userData);
  }

  private async createUserInDatabase(
    args: RegisterArgs,
    hashedPassword: string,
    confirmationToken: string,
    tokenExpiry: Date
  ): Promise<User> {
    return await User.create({
      username: args.username,
      email: args.email,
      password: hashedPassword,
      displayName: args.displayName,
      firstName: args.firstName,
      lastName: args.lastName,
      bio: '',
      profileImage: '',
      bannerImage: '',
      role: 'user',
      isVerified: false,
      emailConfirmed: false,
      emailToken: confirmationToken,
      emailTokenExpire: tokenExpiry,
      lastEmailSent: new Date()
    });
  }

  private generateAuthResult(user: User): AuthResult {
    const { accessToken, refreshToken } = this.generateTokens(user);
    return {
      token: accessToken,
      refreshToken,
      user
    };
  }

  private generateTokens(user: User): { accessToken: string; refreshToken: string } {
    const tokens = this.tokenService.generateTokens(user);
    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken
    };
  }

  private generateBackupCodes(): string[] {
    const codes: string[] = [];
    for (let i = 0; i < 10; i++) {
      const code = `${this.generateRandomCode(4)}-${this.generateRandomCode(4)}-${this.generateRandomCode(4)}`;
      codes.push(code);
    }
    return codes;
  }

  private generateRandomCode(length: number): string {
    const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let result = '';
    const randomBytes = crypto.randomBytes(length);
    for (let i = 0; i < length; i++) {
      result += chars[randomBytes[i] % chars.length];
    }
    return result;
  }
}