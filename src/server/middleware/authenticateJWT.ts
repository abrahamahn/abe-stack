import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

import { UnauthorizedError } from '../../shared/errors/ApiError';
import { env } from '../config/environment';
import { userRepository, UserAttributes } from '../models/User';
import { AuthTokenService } from '../services/AuthTokenService';

interface AuthRequest extends Request {
  headers: {
    authorization?: string;
  };
  user?: UserAttributes;
  token?: string;
}

/**
 * JWT Authentication middleware
 * Verifies the JWT token and attaches the user to the request
 */
export const authenticateJWT = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedError('No token provided');
    }

    const token = authHeader.split(' ')[1];
    const tokenService = AuthTokenService.getInstance();

    // Check if token is blacklisted
    if ((tokenService as unknown as { isTokenBlacklisted(token: string): boolean }).isTokenBlacklisted(token)) {
      throw new UnauthorizedError('Token has been revoked');
    }

    // Verify token
    try {
      const decoded = jwt.verify(token, env.JWT_SECRET) as { id: string };
      
      // Get user from database
      const user = await userRepository.findById(decoded.id);
      if (!user) {
        throw new UnauthorizedError('User not found');
      }

      // Check if email is confirmed
      if (!user.emailConfirmed) {
        throw new UnauthorizedError('Email not confirmed');
      }

      // Attach user and token to request
      req.user = user;
      req.token = token;
      next();
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        throw new UnauthorizedError('Invalid token');
      }
      if (error instanceof jwt.TokenExpiredError) {
        throw new UnauthorizedError('Token expired');
      }
      throw error;
    }
  } catch (error) {
    next(error);
  }
}; 