import { Router } from 'express';
import { User } from '../models';
import { ApiError, NotFoundError, UnauthorizedError, BadRequestError } from '../../shared/errors/ApiError';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { 
  registerSchema, 
  loginSchema, 
  updateProfileSchema, 
  changePasswordSchema,
  refreshTokenSchema,
  twoFactorVerifySchema,
  twoFactorEnableSchema
} from '../validators/auth.validator';
import { TokenService, TokenType } from '../services/TokenService';
import { TwoFactorAuthService } from '../services/TwoFactorAuthService';
import { Logger } from '../services/LoggerService';

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

// Register
router.post('/register', validate(registerSchema), async (req, res, next) => {
  try {
    const { username, email, password, displayName } = req.body;

    // Check if user exists
    const existingUser = await User.findByEmail(email) || await User.findByUsername(username);

    if (existingUser) {
      throw new BadRequestError('User already exists');
    }

    // Create user
    const user = await User.create({
      username,
      email,
      password,
      displayName,
      role: 'user' // Default role
    });

    // Generate tokens
    const { accessToken, refreshToken, expiresIn } = await tokenService.generateTokens(user);

    // Set refresh token as HTTP-only cookie
    res.cookie('refreshToken', refreshToken, REFRESH_TOKEN_COOKIE_OPTIONS);

    // Remove password from response
    const userResponse = user.toJSON();
    delete userResponse.password;

    res.status(201).json({
      status: 'success',
      data: {
        user: userResponse,
        accessToken,
        expiresIn
      }
    });
  } catch (error) {
    logger.error('Registration error', { error });
    next(error);
  }
});

// Login
router.post('/login', validate(loginSchema), async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Check if user exists
    const user = await User.findByEmail(email);
    if (!user) {
      throw new UnauthorizedError('Invalid credentials');
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      throw new UnauthorizedError('Invalid credentials');
    }

    // Check if 2FA is enabled
    const twoFactorStatus = await twoFactorAuthService.getTwoFactorStatus(user.id);
    
    if (twoFactorStatus.enabled) {
      // Return user ID for 2FA verification
      return res.json({
        status: 'success',
        data: {
          requireTwoFactor: true,
          userId: user.id
        }
      });
    }

    // Generate tokens
    const { accessToken, refreshToken, expiresIn } = await tokenService.generateTokens(user);

    // Set refresh token as HTTP-only cookie
    res.cookie('refreshToken', refreshToken, REFRESH_TOKEN_COOKIE_OPTIONS);

    // Remove password from response
    const userResponse = user.toJSON();
    delete userResponse.password;

    res.json({
      status: 'success',
      data: {
        user: userResponse,
        accessToken,
        expiresIn
      }
    });
  } catch (error) {
    logger.error('Login error', { error });
    next(error);
  }
});

// Refresh token
router.post('/refresh', async (req, res, next) => {
  try {
    // Get refresh token from cookie
    const refreshToken = req.cookies.refreshToken;
    
    if (!refreshToken) {
      throw new UnauthorizedError('Refresh token not provided');
    }
    
    // Refresh tokens
    const { accessToken, refreshToken: newRefreshToken, expiresIn } = 
      await tokenService.refreshTokens(refreshToken);
    
    // Set new refresh token as HTTP-only cookie
    res.cookie('refreshToken', newRefreshToken, REFRESH_TOKEN_COOKIE_OPTIONS);
    
    res.json({
      status: 'success',
      data: {
        accessToken,
        expiresIn
      }
    });
  } catch (error) {
    // Clear the cookie if there's an error
    res.clearCookie('refreshToken', { path: '/api/auth/refresh' });
    logger.error('Token refresh error', { error });
    next(error);
  }
});

// Logout
router.post('/logout', authenticate, async (req, res, next) => {
  try {
    // Revoke the current access token
    if (req.token) {
      await tokenService.revokeToken(req.token, TokenType.ACCESS);
    }
    
    // Revoke the refresh token if it exists
    const refreshToken = req.cookies.refreshToken;
    if (refreshToken) {
      await tokenService.revokeToken(refreshToken, TokenType.REFRESH);
    }
    
    // Clear refresh token cookie
    res.clearCookie('refreshToken', { path: '/api/auth/refresh' });
    
    res.json({
      status: 'success',
      message: 'Logged out successfully'
    });
  } catch (error) {
    logger.error('Logout error', { error });
    next(error);
  }
});

// Get current user
router.get('/me', authenticate, async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user!.id);

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Remove password from response
    const userResponse = user.toJSON();
    delete userResponse.password;

    res.json({
      status: 'success',
      data: { user: userResponse }
    });
  } catch (error) {
    logger.error('Get current user error', { error });
    next(error);
  }
});

// Update profile
router.patch('/profile', authenticate, validate(updateProfileSchema), async (req, res, next) => {
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
    
    // Remove password from response
    const userResponse = user.toJSON();
    delete userResponse.password;
    
    res.json({
      status: 'success',
      data: { user: userResponse }
    });
  } catch (error) {
    logger.error('Update profile error', { error });
    next(error);
  }
});

// Change password
router.post('/change-password', authenticate, validate(changePasswordSchema), async (req, res, next) => {
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
router.get('/users', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const users = await User.findAll();
    
    // Remove passwords from response
    const usersResponse = users.map(user => {
      const userData = user.toJSON();
      delete userData.password;
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
router.post('/2fa/setup', authenticate, async (req, res, next) => {
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
router.post('/2fa/enable', authenticate, validate(twoFactorEnableSchema), async (req, res, next) => {
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
router.post('/2fa/disable', authenticate, async (req, res, next) => {
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
router.post('/2fa/backup-codes', authenticate, async (req, res, next) => {
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
router.get('/2fa/status', authenticate, async (req, res, next) => {
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
router.post('/2fa/verify', validate(twoFactorVerifySchema), async (req, res, next) => {
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
    
    // Remove password from response
    const userResponse = { ...user.toJSON() };
    const { password: _password4, ...userWithoutPassword } = userResponse;
    
    res.json({
      status: 'success',
      data: {
        user: userWithoutPassword,
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