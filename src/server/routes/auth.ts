import express from 'express';
import type { Request, Response, NextFunction } from 'express';

import { NotFoundError } from '../../shared/errors/ApiError';
import { AuthController } from '../controllers/AuthController';
import { UnauthorizedError } from '../domains/auth/errors/UnauthorizedError';
import { authenticate, authorize } from '../domains/auth/middleware/auth';
import { authenticateJWT } from '../domains/auth/middleware/authenticateJWT';
import { AuthService } from '../domains/auth/services/AuthService';
import { AuthTokenService, TokenType } from '../domains/auth/services/AuthTokenService';
import { customValidate } from '../middleware/customValidate';
import { User, UserAttributes } from '../models/User';
import { Logger } from '../services/LoggerService';
import { 
  registerSchema, 
  loginSchema, 
  updateProfileSchema, 
  changePasswordSchema,
  twoFactorVerifySchema,
  twoFactorEnableSchema
} from '../validators/auth.validator';

// Cookie settings
const REFRESH_TOKEN_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: '/api/auth/refresh'
} as const;

// Create router with proper typing
const router: express.Router = express.Router();
const tokenService = AuthTokenService.getInstance();
const authService = AuthService.getInstance();
const logger = new Logger('AuthRoutes');
const authController = new AuthController();

// Define a type for the authenticated request
interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    [key: string]: unknown;
  };
  token?: string;
}

// Register
router.post('/register', customValidate(registerSchema), (req: Request, res: Response, next: NextFunction): void => {
  void authController.register(req, res, next);
});

// Login
router.post('/login', customValidate(loginSchema), (req: Request, res: Response, next: NextFunction): void => {
  void authController.login(req, res, next);
});

// Refresh token
router.post('/refresh-token', (req: Request, res: Response, next: NextFunction): void => {
  void authController.refreshToken(req, res, next);
});

// Get current user
router.get('/me', authenticateJWT, (req: Request, res: Response, next: NextFunction): void => {
  authController.getCurrentUser(req, res, next);
});

// Logout
router.post('/logout', authenticateJWT, (req: Request, res: Response, next: NextFunction): void => {
  authController.logout(req, res, next);
});

// Email verification
router.get('/confirm-email', (req: Request, res: Response, next: NextFunction): void => {
  void authController.confirmEmail(req, res, next);
});

router.post('/resend-confirmation', (req: Request, res: Response, next: NextFunction): void => {
  void authController.resendConfirmationEmail(req, res, next);
});

// Update profile
router.patch('/profile', authenticate, customValidate(updateProfileSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authenticatedReq = req as AuthenticatedRequest;
    const { displayName, bio, avatar } = req.body as { displayName?: string; bio?: string; avatar?: string };
    
    if (!authenticatedReq.user) {
      throw new UnauthorizedError('User not authenticated');
    }
    
    const user = await User.findByPk(authenticatedReq.user.id) as unknown as {
      id: string;
      update: (data: Record<string, unknown>) => Promise<unknown>;
      toJSON: () => Record<string, unknown>;
      comparePassword?: (password: string) => Promise<boolean>;
      updatePassword?: (password: string) => Promise<void>;
    };
    
    if (!user) {
      throw new NotFoundError('User not found');
    }
    
    // Update fields if provided
    const updates: Record<string, unknown> = {};
    if (displayName) updates.displayName = displayName;
    if (bio !== undefined) updates.bio = bio;
    if (avatar) updates.avatar = avatar;
    
    await user.update(updates);
    
    res.json({
      status: 'success',
      data: { user: user.toJSON() }
    });
  } catch (error) {
    logger.error('Update profile error', { error });
    next(error);
  }
});

// Change password
router.post('/change-password', authenticate, customValidate(changePasswordSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authenticatedReq = req as AuthenticatedRequest;
    const { currentPassword, newPassword } = req.body as { currentPassword: string; newPassword: string };
    
    if (!authenticatedReq.user) {
      throw new UnauthorizedError('User not authenticated');
    }
    
    const user = await User.findByPk(authenticatedReq.user.id) as unknown as {
      id: string;
      comparePassword: (password: string) => Promise<boolean>;
      updatePassword: (password: string) => Promise<void>;
    };
    
    if (!user) {
      throw new NotFoundError('User not found');
    }
    
    // Verify current password
    const isPasswordValid = await user.comparePassword(currentPassword);
    if (!isPasswordValid) {
      throw new UnauthorizedError('Current password is incorrect');
    }
    
    // Update password
    await user.updatePassword(newPassword);
    
    // Revoke current token to force re-login with new password
    if (req.token) {
      tokenService.blacklistToken(req.token, TokenType.ACCESS);
    }
    
    // Revoke refresh token
    interface CookieObject {
      refreshToken?: string;
    }
    const cookies = req.cookies as CookieObject;
    const refreshToken = cookies.refreshToken;
    if (refreshToken) {
      tokenService.blacklistToken(refreshToken, TokenType.REFRESH);
    }
    
    // Clear refresh token cookie
    res.clearCookie('refreshToken', { path: '/api/auth/refresh' });
    
    res.json({
      status: 'success',
      message: 'Password updated successfully. Please log in again with your new password.'
    });
  } catch (error) {
    logger.error('Change password error', { error });
    next(error);
  }
});

// Admin-only route to get all users
router.get('/users', authenticate, authorize('admin'), async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const users = await User.findAll() as unknown as Array<{
      toJSON: () => Record<string, unknown>;
    }>;
    
    // Remove passwords from response
    const usersResponse = users.map(user => {
      const userData = user.toJSON();
      return userData;
    });
    
    res.json({
      status: 'success',
      data: { users: usersResponse }
    });
  } catch (error) {
    next(error);
  }
});

// Two-factor authentication routes

// Generate 2FA secret
router.post('/2fa/setup', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authenticatedReq = req as AuthenticatedRequest;
    if (!authenticatedReq.user) {
      throw new Error('User not authenticated');
    }
    const { secret, qrCode } = await authService.generate2FASecret(authenticatedReq.user as unknown as UserAttributes);
    
    res.json({
      status: 'success',
      data: {
        secret,
        qrCode
      }
    });
  } catch (error) {
    logger.error('2FA setup error', { error });
    next(error);
  }
});

// Verify and enable 2FA
router.post('/2fa/enable', authenticate, customValidate(twoFactorEnableSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authenticatedReq = req as AuthenticatedRequest;
    const { token } = req.body as { token: string };
    
    if (!authenticatedReq.user) {
      throw new UnauthorizedError('User not authenticated');
    }
    
    const backupCodes = await authService.enable2FA(authenticatedReq.user.id, token);
    
    res.json({
      status: 'success',
      data: {
        backupCodes,
        message: 'Two-factor authentication enabled successfully'
      }
    });
  } catch (error) {
    logger.error('2FA enable error', { error });
    next(error);
  }
});

// Disable 2FA
router.post('/2fa/disable', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authenticatedReq = req as AuthenticatedRequest;
    if (!authenticatedReq.user) {
      throw new UnauthorizedError('User not authenticated');
    }
    
    await authService.disable2FA(authenticatedReq.user.id);
    
    res.json({
      status: 'success',
      message: 'Two-factor authentication disabled successfully'
    });
  } catch (error) {
    logger.error('2FA disable error', { error });
    next(error);
  }
});

// Regenerate backup codes
router.post('/2fa/backup-codes', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authenticatedReq = req as AuthenticatedRequest;
    if (!authenticatedReq.user) {
      throw new UnauthorizedError('User not authenticated');
    }
    
    const backupCodes = await authService.regenerate2FABackupCodes(authenticatedReq.user.id);
    
    res.json({
      status: 'success',
      data: {
        backupCodes
      }
    });
  } catch (error) {
    logger.error('2FA backup codes regeneration error', { error });
    next(error);
  }
});

// Get 2FA status
router.get('/2fa/status', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authenticatedReq = req as AuthenticatedRequest;
    if (!authenticatedReq.user) {
      throw new UnauthorizedError('User not authenticated');
    }
    
    const status = await authService.getTwoFactorStatus(authenticatedReq.user.id);
    
    res.json({
      status: 'success',
      data: status
    });
  } catch (error) {
    logger.error('2FA status error', { error });
    next(error);
  }
});

// Verify 2FA token during login
router.post('/2fa/verify', customValidate(twoFactorVerifySchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, token } = req.body as { userId: string; token: string };
    
    // Verify token
    const isValid = await authService.verify2FAToken(userId, token);
    
    if (!isValid) {
      throw new UnauthorizedError('Invalid verification code');
    }
    
    // Get user
    const user = await User.findByPk(userId) as unknown as { 
      toJSON: () => Record<string, unknown>;
    };
    if (!user) {
      throw new NotFoundError('User not found');
    }
    
    // Generate tokens
    const { accessToken, refreshToken, expiresIn } = tokenService.generateTokens(user as unknown as UserAttributes);
    
    // Set refresh token as HTTP-only cookie
    res.cookie('refreshToken', refreshToken, REFRESH_TOKEN_COOKIE_OPTIONS);
    
    res.json({
      status: 'success',
      data: {
        user: user.toJSON(),
        accessToken,
        expiresIn
      }
    });
  } catch (error) {
    logger.error('2FA verification error', { error });
    next(error);
  }
});

// Export the router
export { router as authRouter }; 