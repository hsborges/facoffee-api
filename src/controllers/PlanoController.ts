import { Request, Response, Router } from 'express';
import { StatusCodes } from 'http-status-codes';

import { hasRole, isAuthenticated } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import { PlanoService } from '../services/PlanoService';
import { wraper } from '../utils/wraper';

export function createRouter(service: PlanoService = new PlanoService()) {
  const router = Router();

  router.get(
    '/',
    validate({ todos: { isBoolean: true, optional: true, in: 'query', default: false } }),
    wraper(async (req: Request, res: Response) => {
      return res.json(await service.listar(req.data.todos));
    }),
  );

  router.get(
    '/:id',
    validate({ id: { isUUID: true, in: 'params' } }),
    wraper(async (req: Request, res: Response) => {
      const plano = await service.buscarPorId(req.data.id);
      return plano ? res.json(plano) : res.sendStatus(StatusCodes.NOT_FOUND);
    }),
  );

  router.post(
    '/',
    hasRole('admin'),
    validate({
      nome: { notEmpty: true, in: 'body' },
      descricao: { notEmpty: true, in: 'body' },
      valor: { isNumeric: true, in: 'body', toFloat: true, custom: { options: (value) => value > 0 } },
    }),
    wraper(async (req: Request, res: Response) => {
      const response = await service.criar(req.data);
      return res.status(StatusCodes.CREATED).json(response);
    }),
  );

  router.patch(
    '/:id',
    hasRole('admin'),
    validate({
      id: { isUUID: true, in: 'params' },
      nome: { notEmpty: true, in: 'body', optional: true },
      descricao: { notEmpty: true, in: 'body', optional: true },
      valor: { isNumeric: true, in: 'body', toFloat: true, custom: { options: (value) => value > 0 }, optional: true },
      ativo: { isBoolean: true, in: 'body', optional: true },
    }),
    wraper(async (req: Request, res: Response) => {
      const { id, ...data } = req.data;
      return res.status(StatusCodes.OK).json(await service.atualizar(id, data));
    }),
  );

  return router;
}
