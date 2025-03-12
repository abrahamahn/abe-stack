// src/server/routes/auth.routes.ts
import Router from 'express';
import { AuthController } from '../controllers/AuthController';
import { customValidate } from '../middleware/customValidate';
import { loginSchema, registerSchema, emailSchema } from '../validators/auth.validator';
import { authLimiter } from '../middleware/rateLimiter';

const router = Router();
const authController = new AuthController();

// Apply stricter rate limiting for auth routes
router.use(authLimiter);

// Auth routes
router.post('/login', customValidate(loginSchema), authController.login);
router.post('/register', customValidate(registerSchema), authController.register);
router.post('/logout', authController.logout);
router.post('/refresh-token', authController.refreshToken);

// Email verification routes
router.get('/confirm-email', authController.confirmEmail);
router.post('/resend-confirmation', customValidate(emailSchema), authController.resendConfirmationEmail);

export default router;