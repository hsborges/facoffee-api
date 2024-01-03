import { faker } from '@faker-js/faker';

import { Assinatura } from '../entities/Assinatura';
import { Plano } from '../entities/Plano';
import { AppDataSource } from '../utils/data-source';
import { AssinaturaError, AssinaturaService } from './AssinaturaService';

describe('Testa AssinaturaService', () => {
  const assinaturaRepo = AppDataSource.getRepository(Assinatura);
  const planoRepo = AppDataSource.getRepository(Plano);

  const service = new AssinaturaService({ repositories: { assinatura: assinaturaRepo, plano: planoRepo } });

  it('deve inscrever, encerrar e listar assinaturas de usuários em planos', async () => {
    const usuario = faker.string.uuid();

    await expect(service.inscrever(usuario, faker.string.uuid())).rejects.toBeDefined();

    const plano = await planoRepo.save(new Plano({ nome: 'Plano Teste', valor: 100, descricao: '' }));

    let assinatura = await service.inscrever(usuario, plano.id);

    expect(assinatura).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        usuario: usuario,
        plano: plano,
        inicio_em: expect.any(Date),
        fim_em: null,
        status: 'ativa',
        encerrada_em: null,
      }),
    );

    await expect(service.inscrever(usuario, plano.id)).rejects.toBeInstanceOf(AssinaturaError);

    await expect(service.encerrar(faker.string.uuid(), 'cancelamento')).rejects.toBeDefined();

    await expect(service.encerrar(assinatura.id, 'cancelamento')).resolves.toEqual(
      expect.objectContaining({ status: 'cancelada', encerrada_em: expect.any(Date) }),
    );

    await expect(service.encerrar(assinatura.id, 'cancelamento')).rejects.toBeDefined();

    assinatura = await service.inscrever(usuario, plano.id);

    await expect(service.encerrar(assinatura.id, 'finalizacao')).resolves.toEqual(
      expect.objectContaining({ status: 'finalizada', encerrada_em: expect.any(Date) }),
    );

    await expect(service.buscarPorUsuario(usuario)).resolves.toHaveLength(2);
  });
});
