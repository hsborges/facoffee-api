import { Request as ERequest, Response } from 'express';

import { UnauthorizedError } from '../utils/errors';
import { SupertokensJwtPayload, hasRole, isAuthenticated } from './auth';

type Request = ERequest & {
  data: any;
  user?: SupertokensJwtPayload;
};

jest.mock('jsonwebtoken', () => ({
  ...jest.requireActual('jsonwebtoken'),
  verify: jest.fn().mockImplementation((token, func, opts, callback) => {
    if (token === 'valid-token') return callback(null, { sub: 'id', roles: ['admin'] });
    else if (token === 'valid-token-2') return callback(null, { sub: 'id', roles: [] });
    else callback(new Error('Invalid token'));
  }),
}));

describe('Testa middleware de autenticação', () => {
  describe('Testa isAuthenticated', () => {
    it('deve retornar Unauthorized se não possuir header "authorization"', () => {
      isAuthenticated()({ headers: {} } as Request, {} as Response, (error) => {
        expect(error).toBeDefined();
        expect(error).toBeInstanceOf(UnauthorizedError);
      });
    });

    it('deve retornar Unauthorized se header "authorization" é invalid', () => {
      isAuthenticated()({ headers: { authorization: 'Bearer ...' } } as Request, {} as Response, (error) => {
        expect(error).toBeDefined();
        expect(error).toBeInstanceOf(UnauthorizedError);
      });
    });

    it('deve configurar req.user se header "authorization" é valid', () => {
      const req = { headers: { authorization: 'Bearer valid-token' } } as Request;
      isAuthenticated()(req, {} as Response, (error) => {
        expect(error).not.toBeDefined();
        expect(req.user).toBeDefined();
        expect(req.user?.sub).toBe('id');
        expect(req.user?.roles).toStrictEqual(['admin']);
      });
    });
  });

  describe('Testa hasRole', () => {
    it('deve retornar Unauthorized se token não é fornecido', () => {
      hasRole('admin')({ headers: {} } as Request, {} as Response, (error) => {
        expect(error).toBeDefined();
        expect(error).toBeInstanceOf(UnauthorizedError);
      });
    });

    it('deve retornar Unauthorized se usuário não tem o papel indicado', () => {
      hasRole('admin')({ headers: { authorization: 'Bearer valid-token-2' } } as Request, {} as Response, (error) => {
        expect(error).toBeDefined();
        expect(error).toBeInstanceOf(UnauthorizedError);
      });
    });

    it('deve passar com sucesso se usuário possui o papel indicado', () => {
      hasRole('admin')({ headers: { authorization: 'Bearer valid-token' } } as Request, {} as Response, (error) => {
        expect(error).toBeUndefined();
      });
    });
  });
});
