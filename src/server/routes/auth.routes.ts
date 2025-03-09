// src/server/routes/auth.routes.ts
import Router from 'express';
import * as authController from '../controllers/auth.controller';
import { validate } from '../middleware/validate';
import { loginSchema, registerSchema } from '../validators/auth.validator';
import { authLimiter } from '../middleware/rateLimiter';

const router = Router();

// Apply stricter rate limiting for auth routes
router.use(authLimiter);

router.post('/login', validate(loginSchema), authController.login);
router.post('/register', validate(registerSchema), authController.register);
router.post('/logout', authController.logout);
router.post('/refresh-token', authController.refreshToken);

export default router;