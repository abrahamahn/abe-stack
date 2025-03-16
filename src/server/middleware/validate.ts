// src/server/middleware/validate.ts
import { Request, Response, NextFunction } from 'express';
import { ParsedQs } from 'qs';
import { AnyZodObject, ZodError } from 'zod';

import { ValidationFailedError } from './error';

type RequestData = {
  body: unknown;
  query: ParsedQs;
  params: Record<string, string>;
};

/**
 * Middleware to validate request data against a Zod schema
 * @param schema Zod schema to validate against
 * @param source Where to find the data to validate (body, query, params)
 */
export const validate = (
  schema: AnyZodObject,
  source: 'body' | 'query' | 'params' | 'all' = 'body'
) => {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      let dataToValidate: unknown;
      
      switch (source) {
        case 'body':
          dataToValidate = req.body;
          break;
        case 'query':
          dataToValidate = req.query;
          break;
        case 'params':
          dataToValidate = req.params;
          break;
        case 'all':
          dataToValidate = {
            body: req.body,
            query: req.query as ParsedQs,
            params: req.params as Record<string, string>
          } as RequestData;
          break;
      }
      
      const validatedData = await schema.parseAsync(dataToValidate);
      
      // Replace the request data with the validated data
      if (source === 'body') req.body = validatedData;
      else if (source === 'query') req.query = validatedData as ParsedQs;
      else if (source === 'params') req.params = validatedData as Record<string, string>;
      else if (source === 'all') {
        const data = validatedData as RequestData;
        req.body = data.body;
        req.query = data.query;
        req.params = data.params;
      }
      
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const formattedErrors: Record<string, string[]> = {};
        
        error.errors.forEach((err) => {
          const path = err.path.join('.');
          if (!formattedErrors[path]) {
            formattedErrors[path] = [];
          }
          formattedErrors[path].push(err.message);
        });
        
        next(new ValidationFailedError('Validation failed', formattedErrors));
      } else {
        next(error);
      }
    }
  };
};