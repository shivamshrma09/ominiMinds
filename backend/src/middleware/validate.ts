import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { logger } from '../utils/logger';

export const validate = (schema: ZodSchema<any>) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      return next();
    } catch (err: any) {
      if (err instanceof ZodError) {
        logger.warn({ err: err.issues }, 'Validation failed');
        return res.status(400).json({
          message: 'Validation failed',
          errors: err.issues.map((e: any) => ({ path: e.path.join('.'), message: e.message })),
        });
      }
      return res.status(500).json({ message: 'Internal server error' });
    }
  };
};
