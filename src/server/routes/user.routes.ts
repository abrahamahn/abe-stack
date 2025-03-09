// src/server/routes/user.routes.ts
import express from 'express';

const router = express.Router();

// Define user routes here
router.get('/', (req, res) => {
  res.json({ message: 'User routes' });
});

export default router;