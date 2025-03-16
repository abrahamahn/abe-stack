import type { Request, Response, NextFunction } from 'express';

import { AppError } from './error';

export const notFoundHandler = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
}; 