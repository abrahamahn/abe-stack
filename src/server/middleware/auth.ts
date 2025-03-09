// src/server/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import { UnauthorizedError, ForbiddenError } from '../../shared/errors/ApiError';
import { User } from '../models';
import { TokenService } from '../services/TokenService';
import { Logger } from '../services/LoggerService';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: User;
      token?: string;
    }
  }
}

const logger = new Logger('AuthMiddleware');
const tokenService = TokenService.getInstance();

/**
 * Authentication middleware
 * Verifies the JWT token and attaches the user to the request
 */
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedError('No token provided');
    }

    const token = authHeader.split(' ')[1];

    // Verify token
    const decoded = await tokenService.verifyAccessToken(token);

    // Get user from database
    const user = await User.findByPk(decoded.userId);
    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    // Attach user and token to request
    req.user = user;
    req.token = token;
    next();
  } catch (error) {
    logger.error('Authentication error', { error });
    next(error);
  }
};

/**
 * Role-based authorization middleware
 * Checks if the user has the required role(s)
 * @param roles Array of allowed roles
 */
export const authorize = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }
    
    if (roles.length > 0 && !roles.includes(req.user.role)) {
      return next(new ForbiddenError(`Role '${req.user.role}' not authorized to access this resource`));
    }
    
    next();
  };
};

