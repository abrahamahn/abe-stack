import type { Request as ExpressRequest, Response as ExpressResponse } from 'express-serve-static-core';
import { NextFunction } from 'express';
import { AppError } from './error';

export const notFoundHandler = (
  req: ExpressRequest,
  _res: ExpressResponse,
  next: NextFunction
) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
}; 