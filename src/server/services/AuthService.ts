import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import { UnauthorizedError } from '../errors/UnauthorizedError';
import { env } from '../config/environment';
import type { Request as ExpressRequest } from 'express';

interface UserData {
  username: string;
  email: string;
  password: string;
  displayName?: string;
}

interface RegisterArgs {
  username: string;
  email: string;
  password: string;
  displayName: string;
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

export class AuthService {
  constructor() {}

  async register(args: RegisterArgs): Promise<AuthResult> {
    // Check if user already exists
    const existingUser = await User.findOne({
      where: {
        email: args.email
      }
    });

    if (existingUser) {
      throw new Error('User already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(args.password, 10);

    // Create user
    const user = await User.create({
      username: args.username,
      email: args.email,
      password: hashedPassword,
      displayName: args.displayName
    });

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
    const user = await User.findOne({
      where: {
        email: args.email
      }
    });

    if (!user) {
      throw new UnauthorizedError('Invalid credentials');
    }

    const validPassword = await bcrypt.compare(args.password, user.password);
    if (!validPassword) {
      throw new UnauthorizedError('Invalid credentials');
    }

    const token = this.generateAccessToken(user.id);
    const refreshToken = this.generateRefreshToken(user.id);

    return {
      token,
      refreshToken,
      user
    };
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
    // Here you would typically implement token blacklisting or invalidation
    // For example, store the token in a redis cache or database of invalidated tokens
    // This is a placeholder implementation
    return true;
  }
}

export default AuthService;
