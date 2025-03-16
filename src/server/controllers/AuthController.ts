import type { Request, Response, NextFunction } from 'express';

import { ConflictError } from '../../shared/errors/ApiError';
import { UnauthorizedError } from '../domains/auth/errors/UnauthorizedError';
import { AuthService } from '../domains/auth/services/AuthService';
import { User } from '../models/User';
import { Database } from '../services/Database';

export class AuthController {
  private db: Database;
  
  constructor() {
    // Pass a default path to the Database constructor
    this.db = new Database(process.env.DB_PATH || './db');
    // Initialize the database connection
    void this.initializeDatabase();
  }

  // Initialize the database connection
  private async initializeDatabase() {
    try {
      await this.db.initialize();
      console.log('Database initialized successfully in AuthController');
    } catch (error) {
      console.error('Failed to initialize database in AuthController:', error);
    }
  }

  // Login handler
  login = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password } = req.body as { email: string; password: string };
      
      const authService = AuthService.getInstance();
      const { token, refreshToken, user } = await authService.login({ email, password });
      
      // Return successful response
      return res.status(200).json({
        status: 'success',
        data: {
          token,
          refreshToken,
          user
        }
      });
    } catch (error) {
      // Handle email confirmation error
      if (error instanceof UnauthorizedError && error.message.includes('confirm your email')) {
        return res.status(401).json({
          status: 'error',
          message: error.message,
          requireEmailConfirmation: true
        });
      }
      
      // Pass to error handler middleware
      next(error);
    }
  };

  // Register handler
  register = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { username, email, password, displayName, firstName, lastName } = req.body as { username: string; email: string; password: string; displayName: string; firstName: string; lastName: string };
      
      // Check if user already exists
      const existingUserByEmail = await User.findByEmail(email);
      
      // We'll only check by email since findByUsername isn't available in the User type
      const existingUser = existingUserByEmail;
      
      if (existingUser && existingUser.emailConfirmed) {
        const errors = {
          email: [`This email is already in use`]
        };
        
        throw new ConflictError('User already exists', errors);
      }
      
      // Register user
      const authService = AuthService.getInstance();
      const { token, refreshToken, user } = await authService.register({
        username,
        email,
        password,
        displayName: displayName || `${firstName} ${lastName}`,
        firstName,
        lastName
      });
      
      // Return successful response
      return res.status(201).json({
        status: 'success',
        message: 'Registration successful. Please check your email to verify your account.',
        data: {
          token,
          refreshToken,
          user
        }
      });
    } catch (error) {
      // Pass to error handler middleware
      next(error);
    }
  };

  // Logout handler
  logout = (req: Request, res: Response, next: NextFunction) => {
    try {
      // Get the token from the request (assuming it's in the Authorization header)
      const authHeader = (req.headers as Record<string, string | string[] | undefined>).authorization as string | undefined;
      const token = authHeader?.split(' ')[1];
      
      if (!token) {
        return res.status(401).json({
          status: 'error',
          message: 'No token provided'
        });
      }

      // Call AuthService to invalidate the token
      const authService = AuthService.getInstance();
      authService.logout(token);
      
      // Return successful response
      return res.status(200).json({
        status: 'success',
        message: 'Logged out successfully'
      });
    } catch (error) {
      // Pass to error handler middleware
      next(error);
    }
  };

  // Refresh Token handler
  refreshToken = async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Get the refresh token from the request body
      const { refreshToken } = req.body as { refreshToken: string };
      
      if (!refreshToken) {
        return res.status(400).json({
          status: 'error',
          message: 'Refresh token is required'
        });
      }

      // Call AuthService to refresh the token
      const authService = AuthService.getInstance();
      const result = await authService.refreshToken(refreshToken);
      const { token, refreshToken: newRefreshToken } = result;
      
      // Return successful response
      return res.status(200).json({
        status: 'success',
        data: {
          token,
          refreshToken: newRefreshToken
        }
      });
    } catch (error) {
      // Pass to error handler middleware
      next(error);
    }
  };

  // Get current user handler
  getCurrentUser = (req: Request, res: Response, next: NextFunction) => {
    try {
      // User should be attached to the request by the authentication middleware
      if (!req.user) {
        return res.status(401).json({
          status: 'error',
          message: 'Not authenticated'
        });
      }

      // Return the user data
      return res.status(200).json({
        status: 'success',
        data: {
          user: req.user as Record<string, unknown>
        }
      });
    } catch (error) {
      next(error);
    }
  };

  // Email confirmation handler
  confirmEmail = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { token } = req.query as { token: string | string[] | undefined };
      
      if (!token || typeof token !== 'string') {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid token'
        });
      }

      const authService = AuthService.getInstance();
      await authService.confirmEmail(token);
      
      // Redirect to the login page with a success message
      res.status(302).json({ redirectUrl: '/login?verified=true' });
      return;
    } catch (error) {
      next(error);
    }
  };

  // Resend confirmation email handler
  resendConfirmationEmail = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email } = req.body as { email: string };
      
      if (!email) {
        return res.status(400).json({
          status: 'error',
          message: 'Email is required'
        });
      }

      const authService = AuthService.getInstance();
      await authService.resendConfirmationEmail(email);
      
      return res.status(200).json({
        status: 'success',
        message: 'Confirmation email sent successfully'
      });
    } catch (error) {
      next(error);
    }
  };
}