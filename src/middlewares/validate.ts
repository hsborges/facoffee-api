import { NextFunction, Request, Response } from 'express';
import { Schema, checkSchema, matchedData, validationResult } from 'express-validator';

export function validate(schema: Schema) {
  return [
    ...checkSchema(schema),
    (req: Request, res: Response, next: NextFunction) => {
      const result = validationResult(req);
      req.data = matchedData(req);
      if (result.isEmpty()) return next();
      try {
        result.throw();
      } catch (error: any) {
        res.status(400).json({ errors: result.array() });
      }
    },
  ];
}
