import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import User from '../models/User';
import { UnauthorizedError } from '../errors/UnauthorizedError';
import { env } from '../config/environment';
import { tokenBlacklist } from '../services/TokenBlacklist';
import { EmailService } from './EmailService';
import { Database } from './Database';

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
  user: User;
}

export default class AuthService {
  private emailService: EmailService;
  private db: Database;

  constructor(db: Database) {
    this.db = db;
    
    // Ensure database is initialized
    if (!this.db.isConnected()) {
      this.initializeDatabase();
    }
    
    this.emailService = new EmailService(this.db);
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

  async register(args: RegisterArgs): Promise<AuthResult> {
    // Check if user already exists
    const existingUser = await User.findByEmail(args.email);
    if (existingUser) {
      // If user exists but email is not confirmed, resend confirmation email
      if (existingUser && !existingUser.emailConfirmed) {
        const confirmationToken = crypto.randomBytes(32).toString('hex');
        const tokenExpiry = new Date();
        tokenExpiry.setHours(tokenExpiry.getHours() + 24); // Token expires in 24 hours

        const pool = this.db.getPool();
        if (pool) {
          await pool.query(
            'UPDATE users SET email_token = $1, email_token_expire = $2, last_email_sent = NOW() WHERE id = $3',
            [confirmationToken, tokenExpiry, existingUser.id]
          );
        } else {
          console.warn('Database pool is not available, skipping update of email token');
        }

        await this.emailService.sendConfirmationEmail(existingUser.email, confirmationToken);

        return {
          token: this.generateAccessToken(existingUser.id),
          refreshToken: this.generateRefreshToken(existingUser.id),
          user: existingUser
        };
      }
      throw new Error('User already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(args.password, 10);

    // Generate confirmation token
    const confirmationToken = crypto.randomBytes(32).toString('hex');
    const tokenExpiry = new Date();
    tokenExpiry.setHours(tokenExpiry.getHours() + 24); // Token expires in 24 hours

    // Create user - handle both real DB and in-memory mode
    let user;
    if (this.db.isInMemoryMode && this.db.isInMemoryMode()) {
      // Mock user creation for in-memory mode
      const userId = crypto.randomUUID();
      user = {
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
      
      // Store in in-memory DB
      const pool = this.db.getPool();
      if (pool) {
        await pool.query(
          'INSERT INTO users (id, username, email, password, display_name, first_name, last_name, bio, profile_image, banner_image, role, is_verified, email_confirmed, email_token, email_token_expire, last_email_sent) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)',
          [userId, args.username, args.email, hashedPassword, args.displayName, args.firstName, args.lastName, '', '', '', 'user', false, false, confirmationToken, tokenExpiry, new Date()]
        );
      }
    } else {
      // Regular DB user creation
      user = await User.create({
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

    // Send confirmation email
    await this.emailService.sendConfirmationEmail(user.email, confirmationToken);

    // Generate tokens
    const token = this.generateAccessToken(user.id);
    const refreshToken = this.generateRefreshToken(user.id);

    return {
      token,
      refreshToken,
      user
    };
  }

  async login(args: LoginArgs): Promise<AuthResult> {
    const user = await User.findByEmail(args.email);
    if (!user) {
      throw new UnauthorizedError('Invalid credentials');
    }

    const validPassword = await bcrypt.compare(args.password, user.password);
    if (!validPassword) {
      throw new UnauthorizedError('Invalid credentials');
    }

    // Check if email is confirmed
    if (!user.emailConfirmed) {
      // Generate new confirmation token
      const confirmationToken = crypto.randomBytes(32).toString('hex');
      const tokenExpiry = new Date();
      tokenExpiry.setHours(tokenExpiry.getHours() + 24); // Token expires in 24 hours

      const pool = this.db.getPool();
      if (pool) {
        await pool.query(
          'UPDATE users SET email_token = $1, email_token_expire = $2 WHERE id = $3',
          [confirmationToken, tokenExpiry, user.id]
        );
      } else {
        console.warn('Database pool is not available, skipping update of email token');
      }

      // Send confirmation email
      await this.emailService.sendConfirmationEmail(user.email, confirmationToken);

      throw new UnauthorizedError('Please confirm your email address. A new confirmation email has been sent.');
    }

    const token = this.generateAccessToken(user.id);
    const refreshToken = this.generateRefreshToken(user.id);

    return {
      token,
      refreshToken,
      user
    };
  }

  async confirmEmail(token: string): Promise<boolean> {
    // Find user with the given token
    const pool = this.db.getPool();
    if (!pool) {
      throw new Error('Database connection not available');
    }
    
    const result = await pool.query(
      'SELECT id FROM users WHERE email_token = $1 AND email_token_expire > NOW()',
      [token]
    );

    if (result.rows.length === 0) {
      throw new Error('Invalid or expired token');
    }

    const userId = result.rows[0].id;

    // Update user to confirm email - using the same pool variable
    await pool.query(
      'UPDATE users SET email_confirmed = TRUE, email_token = NULL, email_token_expire = NULL WHERE id = $1',
      [userId]
    );

    return true;
  }

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
    tokenExpiry.setHours(tokenExpiry.getHours() + 24); // Token expires in 24 hours

    const pool = this.db.getPool();
    if (!pool) {
      throw new Error('Database connection not available');
    }
    
    await pool.query(
      'UPDATE users SET email_token = $1, email_token_expire = $2 WHERE id = $3',
      [confirmationToken, tokenExpiry, user.id]
    );

    // Send confirmation email
    await this.emailService.sendConfirmationEmail(user.email, confirmationToken);

    return true;
  }

  async getCurrentUser(token: string): Promise<User> {
    try {
      const decoded = jwt.verify(token, env.JWT_SECRET) as { id: string };
      const user = await User.findByPk(decoded.id);
      
      if (!user) {
        throw new UnauthorizedError('User not found');
      }

      return user;
    } catch (error) {
      throw new UnauthorizedError('Invalid token');
    }
  }

  async refreshToken(refreshToken: string): Promise<{ token: string; refreshToken: string }> {
    try {
      const decoded = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as { id: string };
      const user = await User.findByPk(decoded.id);

      if (!user) {
        throw new UnauthorizedError('User not found');
      }

      const newToken = this.generateAccessToken(user.id);
      const newRefreshToken = this.generateRefreshToken(user.id);

      return {
        token: newToken,
        refreshToken: newRefreshToken
      };
    } catch (error) {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }
  }

  private generateAccessToken(userId: string): string {
    return jwt.sign({ id: userId }, env.JWT_SECRET, {
      expiresIn: '15m'
    });
  }

  private generateRefreshToken(userId: string): string {
    return jwt.sign({ id: userId }, env.JWT_REFRESH_SECRET, {
      expiresIn: '7d'
    });
  }

  // Logout method
  static async logout(token: string) {
    // Add token to blacklist with its remaining expiry time
    const decoded = jwt.decode(token) as { exp?: number } | null;
    if (decoded?.exp) {
      const remainingTime = decoded.exp - Math.floor(Date.now() / 1000);
      if (remainingTime > 0) {
        tokenBlacklist.add(token, remainingTime);
      }
    }
    return true;
  }
}
