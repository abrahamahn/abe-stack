import { Request, Response } from "express";

/**
 * Interface for error handling middleware
 */
export interface IErrorHandler {
  /**
   * Handle errors and send appropriate responses
   */
  handleError(error: Error, req: Request, res: Response): Response;
}
