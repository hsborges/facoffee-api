import { SupertokensJwtPayload } from './middlewares/auth';

declare global {
  namespace Express {
    export interface Request {
      data: any;
      user?: SupertokensJwtPayload;
    }
  }

  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: 'dev' | 'prod' | 'test';
      PORT: string;
      DATABASE_URL: string;
      AUTH_BASE_URL: string;
      BASE_URL?: string;
      DATA_DIR?: string;
    }
  }
}
