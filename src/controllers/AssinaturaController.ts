import { Request, Response, Router } from 'express';
import { StatusCodes } from 'http-status-codes';

import { isAuthenticated } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import { AssinaturaError, AssinaturaService } from '../services/AssinaturaService';
import { wraper } from '../utils/wraper';

export function createRouter(service: AssinaturaService = new AssinaturaService()) {
  const router = Router();

  router.post(
    '/inscrever',
    isAuthenticated(),
    validate({
      plano: { isUUID: true },
      duracao: { isInt: true, toInt: true, optional: true, custom: { options: (value) => value > 0 } },
    }),
    wraper(async (req: Request, res: Response) => {
      const { duracao, plano } = req.data;

      return service
        .inscrever(req.user?.sub as string, plano, { duracaoEmMeses: duracao || undefined })
        .then((assinatura) => res.status(StatusCodes.CREATED).json(assinatura));
    }),
  );

  router.post(
    '/cancelar',
    isAuthenticated(),
    wraper(async (req: Request, res: Response) => {
      const assinatura = await service
        .buscarPorUsuario(req.user?.sub as string)
        .then((ass) => ass.find((a) => a.status === 'ativa'));

      if (!assinatura) throw new AssinaturaError('Usuário não possui assinatura ativa.');

      return service
        .encerrar(assinatura.id, 'cancelamento')
        .then((assinatura) => res.status(StatusCodes.OK).json(assinatura));
    }),
  );

  router.get(
    '/historico',
    isAuthenticated(),
    wraper(async (req: Request, res: Response) => {
      return service
        .buscarPorUsuario(req.user?.sub as string)
        .then((assinaturas) => res.status(StatusCodes.OK).json(assinaturas));
    }),
  );

  router.get('/ultima', isAuthenticated(), async (req: Request, res: Response) => {
    const assinatura = await service
      .buscarPorUsuario(req.user?.sub as string)
      .then((assinaturas) => assinaturas.sort((a, b) => b.inicio_em.getTime() - a.inicio_em.getTime()).at(0));

    if (!assinatura) return res.status(StatusCodes.NOT_FOUND).json({ message: 'Usuário não possui assinaturas' });
    else return res.status(StatusCodes.OK).json(assinatura);
  });

  return router;
}
