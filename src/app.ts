import compression from 'compression';
import cors from 'cors';
import express, { NextFunction, Request, RequestHandler, Response, Router, json, urlencoded } from 'express';
import helmet from 'helmet';
import morgan from 'morgan';

import { HttpError } from './utils/errors';

export function createApp(routes: Array<{ path: string; router: RequestHandler | Array<RequestHandler> }>) {
  const app = express();

  app.use(json());
  app.use(urlencoded({ extended: true }));
  app.use(compression());
  app.use(helmet());
  app.use(cors());

  if (process.env.NODE_ENV !== 'test') {
    app.use(morgan(process.env.NODE_ENV === 'dev' ? 'dev' : 'tiny'));
  }

  routes.forEach((route) => app.use(route.path, ...(Array.isArray(route.router) ? route.router : [route.router])));

  app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
    if (error instanceof HttpError) return res.status(error.code).json({ error: error.message });
    next(error);
  });

  return app;
}
