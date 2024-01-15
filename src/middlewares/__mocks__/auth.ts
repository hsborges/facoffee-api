import { faker } from '@faker-js/faker';
import { NextFunction, Request, Response } from 'express';

import { UnauthorizedError } from '../../utils/errors';
import { SupertokensJwtPayload } from '../auth';

export const tokensPayload: Record<string, SupertokensJwtPayload> = {
  user: {
    iat: faker.number.int({ min: 0, max: 100000 }),
    exp: faker.number.int({ min: 0, max: 100000 }),
    sub: '017097f5-cbdd-42a9-8742-dfc2318722e7',
    tId: faker.string.alpha(),
    rsub: '017097f5-cbdd-42a9-8742-dfc2318722e7',
    iss: faker.internet.url(),
    roles: [],
    email_verified: true,
  },
  admin: {
    iat: faker.number.int({ min: 0, max: 100000 }),
    exp: faker.number.int({ min: 0, max: 100000 }),
    sub: 'ee777a71-3e16-47c7-80fd-1a4da9be6bc7',
    tId: faker.string.alpha(),
    rsub: 'ee777a71-3e16-47c7-80fd-1a4da9be6bc7',
    iss: faker.internet.url(),
    roles: ['admin'],
    email_verified: true,
  },
};

export const tokens = {
  user: tokensPayload.user.sub,
  admin: tokensPayload.admin.sub,
};

export function isAuthenticated() {
  return async (req: Request, res: Response, next: NextFunction) => {
    const token = req.headers.authorization?.split(' ')[1];

    if (token) {
      for (const [key, value] of Object.entries(tokens)) {
        if (token === value) {
          req.user = tokensPayload[key] as SupertokensJwtPayload;
          return next();
        }
      }
    }

    return next(new UnauthorizedError('Unauthorized'));
  };
}

export function hasRole(role: 'admin') {
  return [
    isAuthenticated(),
    (req: Request, res: Response, next: NextFunction) => {
      if (req.user?.roles.includes(role)) return next();
      return next(new UnauthorizedError('Unauthorized'));
    },
  ];
}
