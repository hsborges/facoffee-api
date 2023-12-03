import { NextFunction, Request, Response } from 'express';
import jsonwebtoken, { JwtPayload } from 'jsonwebtoken';
import jwksRsa from 'jwks-rsa';

import { UnauthorizedError } from '../utils/errors';

export interface SupertokensJwtPayload {
  iat: number;
  exp: number;
  sub: string;
  tId: string;
  rsub: string;
  iss: string;
  roles: string[];
  email_verified: boolean;
}

const client = jwksRsa({ jwksUri: `${process.env.AUTH_BASE_URL}/jwt/jwks.json` });

function getKey(header: any, callback: (err: Error | null, key?: string) => any) {
  client
    .getSigningKey(header.kid)
    .then((key) => callback(null, key.getPublicKey()))
    .catch(callback);
}

function verify(token: string) {
  return new Promise<SupertokensJwtPayload>((resolve, reject) => {
    jsonwebtoken.verify(token, getKey, {}, function (err, decoded) {
      if (err) return reject(new UnauthorizedError(err.message || JSON.stringify(err)));
      return resolve(decoded as SupertokensJwtPayload);
    });
  });
}

export function isAuthenticated() {
  return async (req: Request, res: Response, next: NextFunction) => {
    const token = req.headers.authorization?.split(' ')[1];

    if (token) {
      return verify(token)
        .then((user) => (req.user = user))
        .then(() => next())
        .catch((error) => next(error));
    }

    return next(new UnauthorizedError());
  };
}

export function hasRole(role: 'admin') {
  return async (req: Request, res: Response, next: NextFunction) => {
    const callback: NextFunction = (error) => {
      if (error) return next(error);
      if (req.user?.roles.includes(role)) return next();
      return next(new UnauthorizedError());
    };

    return req.user ? callback() : isAuthenticated()(req, res, callback);
  };
}
