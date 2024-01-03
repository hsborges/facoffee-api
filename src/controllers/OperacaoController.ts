import { NextFunction, Request, Response, Router } from 'express';

import { hasRole, isAuthenticated } from '../middlewares/auth';
import { upload } from '../middlewares/multer';
import { validate } from '../middlewares/validate';
import { OperacaoService } from '../services/OperacaoService';
import { UnauthorizedError } from '../utils/errors';

export function createRouter(service: OperacaoService = new OperacaoService()) {
  const router = Router();

  router.get(
    '/saldo',
    isAuthenticated(),
    validate({ usuario: { isUUID: true, in: 'query', optional: true } }),
    async (req: Request<{ usuario: string }>, res: Response, next: NextFunction) => {
      if (req.query.usuario && !req.user?.roles.includes('admin')) return next(new UnauthorizedError());
      const id = (req.query.usuario ? req.query.usuario : req.user?.sub) as string;
      return res.json(await service.resumoPorUsuario(id));
    },
  );

  router.get(
    '/extrato',
    isAuthenticated(),
    validate({ usuario: { isUUID: true, in: 'query', optional: true } }),
    async (req: Request<{ usuario: string }>, res: Response, next: NextFunction) => {
      if (req.query.usuario && !req.user?.roles.includes('admin')) return next(new UnauthorizedError());
      const id = (req.query.usuario ? req.query.usuario : req.user?.sub) as string;
      return res.json(await service.buscarPorUsuario(id));
    },
  );

  router.post(
    '/credito',
    isAuthenticated(),
    upload.single('comprovante'),
    validate({
      usuario: { isUUID: true, in: 'body', optional: true },
      valor: { isNumeric: true, in: 'body', toFloat: true, custom: { options: (value) => value > 0 } },
      referencia: { notEmpty: true, in: 'body' },
      comprovante: {
        custom: {
          options: (value, { req }) => !!req.file,
          errorMessage: 'O campo comprovante é obrigatório',
        },
      },
      descricao: { optional: true, in: 'body' },
    }),
    async (req: Request<{ usuario: string }>, res: Response) => {
      return res.status(201).json(
        await service.creditar({
          ...req.data,
          usuario: req.data.usuario || req.user?.sub,
          emissor: req.user?.sub,
          comprovante: { name: req.file?.originalname, data: req.file?.buffer },
        }),
      );
    },
  );

  router.patch(
    '/credito/:operacao',
    isAuthenticated(),
    hasRole('admin'),
    validate({
      operacao: { isUUID: true, in: 'params' },
      status: { isString: true, in: 'body', isIn: { options: [['aprovado', 'rejeitado']] } },
    }),
    async (req: Request, res: Response) => {
      req.data.revisado_por = req.user?.sub;
      const { operacao, ...data } = req.data;
      return res.json(await service.revisar(operacao, data));
    },
  );

  router.post(
    '/debito',
    isAuthenticated(),
    hasRole('admin'),
    validate({
      usuario: { isUUID: true, in: 'body' },
      valor: { isNumeric: true, in: 'body', toFloat: true, custom: { options: (value) => value > 0 } },
      referencia: { notEmpty: true, in: 'body' },
      descricao: { optional: true, in: 'body' },
    }),
    async (req: Request, res: Response) => {
      return res.status(201).json(await service.debitar({ ...req.data, emissor: req.user?.sub }));
    },
  );

  return router;
}
