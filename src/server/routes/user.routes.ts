// src/server/routes/user.routes.ts
import Router from 'express';
import type { Request, Response } from 'express';

const router = Router();

// Define user routes here
router.get('/', (_req: Request, res: Response) => {
  res.json({ message: 'User routes' });
});

export default router;