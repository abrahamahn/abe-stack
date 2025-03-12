// src/server/routes/auth.routes.ts
import Router from 'express';
import * as authController from '../controllers/auth.controller';
import { customValidate } from '../middleware/customValidate';
import { loginSchema, registerSchema } from '../validators/custom-auth.validator';
import { authLimiter } from '../middleware/rateLimiter';

const router = Router();

// Apply stricter rate limiting for auth routes
router.use(authLimiter);

// Auth routes
router.post('/login', customValidate(loginSchema), authController.login);
router.post('/register', customValidate(registerSchema), authController.register);
router.post('/logout', authController.logout);
router.post('/refresh-token', authController.refreshToken);

export default router;