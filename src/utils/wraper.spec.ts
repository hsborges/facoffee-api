import { NextFunction, Request, Response } from 'express';

import { HttpError } from './errors';
import { wraper } from './wraper';

class CustomHttpError extends HttpError {
  constructor(message: string, code: number) {
    super(message, code);
  }
}

describe('Testa utilitario wraper', () => {
  const wrapped = wraper(async (req: Request, res: Response, next?: NextFunction) => {
    if (req.query?.type == 'HttpError') throw new CustomHttpError('Test', 0);
    else if (req.query?.type == 'Error') throw new Error('Test');
    else return 'OK';
  });

  it('deve responder diretamente à requisição se HttpError for lançado', async () => {
    const req = { query: { type: 'HttpError' } } as unknown as Request;
    const next = jest.fn();
    const res = {} as Response;
    res.status = jest.fn().mockReturnValue(res);
    res.json = res.send = jest.fn();

    await wrapped(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(0);
    expect(res.send).toHaveBeenCalledWith({ message: 'Test' });
  });

  it('deve propagar erro se n for lançadoão for um HttpError', async () => {
    const req = { query: { type: 'Error' } } as unknown as Request;
    const next = jest.fn();
    const res = {} as Response;
    res.json = res.send = res.status = jest.fn();

    await wrapped(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(new Error('Test'));
    expect(res.send).not.toHaveBeenCalled();
  });

  it('deve continuar normalmente se nenhum erro for lançado', async () => {
    const req = { query: {} } as unknown as Request;
    const next = jest.fn();
    const res = {} as Response;
    res.json = res.send = res.status = jest.fn();

    await wrapped(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.send).not.toHaveBeenCalled();
  });
});
