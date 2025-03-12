import type { Request, Response, NextFunction } from 'express';
import User from '../models/User';
import AuthService from '../services/AuthService';
import { ConflictError, UnauthorizedError } from '../../shared/errors/ApiError';
import { Database } from '../services/Database';

export class AuthController {
  private db: Database;
  
  constructor() {
    // Pass a default path to the Database constructor
    this.db = new Database(process.env.DB_PATH || './db');
  }

  // Login handler
  login = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password } = req.body;
      
      const authService = new AuthService(this.db);
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
      const { username, email, password, displayName, firstName, lastName } = req.body;
      
      // Check if user already exists
      const existingUserByEmail = await User.findByEmail(email);
      const existingUserByUsername = await User.findByUsername(username);
      const existingUser = existingUserByEmail || existingUserByUsername;
      
      if (existingUser && existingUser.emailConfirmed) {
        const errorField = existingUserByEmail ? 'email' : 'username';
        const errors = {
          [errorField]: [`This ${errorField} is already in use`]
        };
        
        throw new ConflictError('User already exists', errors);
      }
      
      // Register user
      const authService = new AuthService(this.db);
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
  logout = async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Get the token from the request (assuming it's in the Authorization header)
      const token = req.headers.authorization?.split(' ')[1];
      
      if (!token) {
        return res.status(401).json({
          status: 'error',
          message: 'No token provided'
        });
      }

      // Call AuthService to invalidate the token
      await AuthService.logout(token);
      
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
      const { refreshToken } = req.body;
      
      if (!refreshToken) {
        return res.status(400).json({
          status: 'error',
          message: 'Refresh token is required'
        });
      }

      // Call AuthService to refresh the token
      const authService = new AuthService(this.db);
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
  getCurrentUser = async (req: Request, res: Response, next: NextFunction) => {
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
          user: req.user
        }
      });
    } catch (error) {
      next(error);
    }
  };

  // Email confirmation handler
  confirmEmail = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { token } = req.query;
      
      if (!token || typeof token !== 'string') {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid token'
        });
      }

      const authService = new AuthService(this.db);
      await authService.confirmEmail(token);
      
      // Redirect to the login page with a success message
      return res.redirect('/login?verified=true');
    } catch (error) {
      next(error);
    }
  };

  // Resend confirmation email handler
  resendConfirmationEmail = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({
          status: 'error',
          message: 'Email is required'
        });
      }

      const authService = new AuthService(this.db);
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