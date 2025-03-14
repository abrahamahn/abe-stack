import Router from 'express';
import type { Request, Response, NextFunction } from 'express';
import { User } from '../models';
import { NotFoundError, UnauthorizedError } from '../../shared/errors/ApiError';
import { authenticate, authorize } from '../middleware/auth';
import { customValidate } from '../middleware/customValidate';
import { 
  registerSchema, 
  loginSchema, 
  updateProfileSchema, 
  changePasswordSchema,
  twoFactorVerifySchema,
  twoFactorEnableSchema
} from '../validators/auth.validator';
import { TokenService, TokenType } from '../services/TokenService';
import { TwoFactorAuthService } from '../services/TwoFactorAuthService';
import { Logger } from '../services/LoggerService';
import { AuthController } from '../controllers/AuthController';
import { authenticateJWT } from '../middleware/authenticateJWT';

// Cookie settings
const REFRESH_TOKEN_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: '/api/auth/refresh'
} as const;

const router = Router();
const tokenService = TokenService.getInstance();
const twoFactorAuthService = TwoFactorAuthService.getInstance();
const logger = new Logger('AuthRoutes');
const authController = new AuthController();

// Register
router.post('/register', customValidate(registerSchema), (req, res, next) => {
  console.log('Register route hit with body:', JSON.stringify(req.body, null, 2));
  return authController.register(req, res, next);
});

// Login
router.post('/login', customValidate(loginSchema), authController.login);

// Refresh token
router.post('/refresh-token', authController.refreshToken);

// Get current user
router.get('/me', authenticateJWT, authController.getCurrentUser);

// Logout
router.post('/logout', authenticateJWT, authController.logout);

// Email verification
router.get('/confirm-email', authController.confirmEmail);
router.post('/resend-confirmation', authController.resendConfirmationEmail);

// Update profile
router.patch('/profile', authenticate, customValidate(updateProfileSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { displayName, bio, avatar } = req.body;
    
    const user = await User.findByPk(req.user!.id);
    
    if (!user) {
      throw new NotFoundError('User not found');
    }
    
    // Update fields if provided
    const updates: any = {};
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
    const { currentPassword, newPassword } = req.body;
    
    const user = await User.findByPk(req.user!.id);
    
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
      await tokenService.revokeToken(req.token, TokenType.ACCESS);
    }
    
    // Revoke refresh token
    const refreshToken = req.cookies.refreshToken;
    if (refreshToken) {
      await tokenService.revokeToken(refreshToken, TokenType.REFRESH);
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
    const users = await User.findAll();
    
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
    const { secret, qrCode } = await twoFactorAuthService.generateSecret(req.user!);
    
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
    const { token } = req.body;
    
    const backupCodes = await twoFactorAuthService.enableTwoFactor(req.user!.id, token);
    
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
    await twoFactorAuthService.disableTwoFactor(req.user!.id);
    
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
    const backupCodes = await twoFactorAuthService.regenerateBackupCodes(req.user!.id);
    
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
    const status = await twoFactorAuthService.getTwoFactorStatus(req.user!.id);
    
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
    const { userId, token } = req.body;
    
    // Verify token
    const isValid = await twoFactorAuthService.verifyToken(userId, token);
    
    if (!isValid) {
      throw new UnauthorizedError('Invalid verification code');
    }
    
    // Get user
    const user = await User.findByPk(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }
    
    // Generate tokens
    const { accessToken, refreshToken, expiresIn } = await tokenService.generateTokens(user);
    
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

export { router as authRouter }; 