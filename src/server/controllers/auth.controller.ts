import { Request, Response, NextFunction } from 'express-serve-static-core';
import User from '../models/User';
import AuthService from '../services/AuthService';
import { ConflictError } from '../../shared/errors/ApiError';

// Login handler
export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;
    
    const authService = new AuthService();
    const { token, user } = await authService.login({ email, password });
    
    // Return successful response
    return res.status(200).json({
      status: 'success',
      data: {
        token,
        user
      }
    });
  } catch (error) {
    // Pass to error handler middleware
    next(error);
  }
};

// Register handler
export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { username, email, password, displayName } = req.body;
    
    // Check if user already exists
    const existingUserByEmail = await User.findByEmail(email);
    const existingUserByUsername = await User.findByUsername(username);
    const existingUser = existingUserByEmail || existingUserByUsername;
    
    if (existingUser) {
      const errorField = existingUserByEmail ? 'email' : 'username';
      const errors = {
        [errorField]: [`This ${errorField} is already in use`]
      };
      
      throw new ConflictError('User already exists', errors);
    }
    
    // Register user
    const authService = new AuthService();
    const { token, user } = await authService.register({
      username,
      email,
      password,
      displayName
    });
    
    // Return successful response
    return res.status(201).json({
      status: 'success',
      data: {
        token,
        user
      }
    });
  } catch (error) {
    // Pass to error handler middleware
    next(error);
  }
};

// Logout handler
export const logout = async (req: Request, res: Response, next: NextFunction) => {
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
export const refreshToken = async (req: Request, res: Response, next: NextFunction) => {
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
    const authService = new AuthService();
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