import { NextFunction, Request, Response } from 'express';

import { HttpError } from './errors';

export function wraper<T>(action: (req: Request, res: Response, next?: NextFunction) => Promise<T>) {
  return async (req: Request, res: Response, next: NextFunction): Promise<T | undefined> => {
    try {
      return await action(req, res, next);
    } catch (error) {
      if (error instanceof HttpError) {
        res.status(error.code).send({ message: error.message });
        return;
      }

      next(error);
    }
  };
}
