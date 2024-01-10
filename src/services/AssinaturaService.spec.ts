import { faker } from '@faker-js/faker';
import dayjs from 'dayjs';
import { uniq } from 'lodash';

import { Assinatura } from '../entities/Assinatura';
import { Operacao } from '../entities/Operacao';
import { Plano } from '../entities/Plano';
import { AppDataSource } from '../utils/data-source';
import { AssinaturaError, AssinaturaService } from './AssinaturaService';

describe('Testa AssinaturaService', () => {
  const assinaturaRepo = AppDataSource.getRepository(Assinatura);
  const planoRepo = AppDataSource.getRepository(Plano);
  const operacaoRepo = AppDataSource.getRepository(Operacao);

  const service = new AssinaturaService({ repositories: { assinatura: assinaturaRepo, plano: planoRepo } });

  const usuario = faker.string.uuid();

  let plano: Plano;

  beforeEach(() => AppDataSource.synchronize(true));
  beforeEach(async () => (plano = await planoRepo.save(new Plano({ nome: 'Plano Teste', valor: 100, descricao: '' }))));

  it('deve inscrever, encerrar e listar assinaturas de usuários em planos', async () => {
    await expect(service.inscrever(usuario, faker.string.uuid())).rejects.toBeDefined();

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

    await service.buscarPorUsuario(usuario).then((assinaturas) => {
      expect(assinaturas).toHaveLength(2);
      expect(uniq(assinaturas.map((a) => a.usuario))).toEqual([usuario]);
    });
  });

  describe('buscarAssinaturas()', () => {
    it('deve permitir buscar assinaturas por usuario e status', async () => {
      expect(await service.buscarAssinaturas({ status: 'ativa' })).toHaveLength(0);

      let assinatura = await service.inscrever(usuario, plano.id);
      expect(await service.buscarAssinaturas({ status: 'ativa' })).toHaveLength(1);
      expect(await service.buscarAssinaturas({ status: 'cancelada' })).toHaveLength(0);
      expect(await service.buscarAssinaturas({ status: 'finalizada' })).toHaveLength(0);

      await service.encerrar(assinatura.id, 'cancelamento');
      expect(await service.buscarAssinaturas({ status: 'ativa' })).toHaveLength(0);
      expect(await service.buscarAssinaturas({ status: 'cancelada' })).toHaveLength(1);

      assinatura = await service.inscrever(usuario, plano.id);
      expect(await service.buscarAssinaturas({ status: 'ativa' })).toHaveLength(1);
      expect(await service.buscarAssinaturas({ status: 'cancelada' })).toHaveLength(1);

      await service.encerrar(assinatura.id, 'finalizacao');
      expect(await service.buscarAssinaturas({ status: 'ativa' })).toHaveLength(0);
      expect(await service.buscarAssinaturas({ status: 'cancelada' })).toHaveLength(1);
      expect(await service.buscarAssinaturas({ status: 'finalizada' })).toHaveLength(1);

      expect(await service.buscarAssinaturas({ usuarioId: usuario })).toHaveLength(2);
      expect(await service.buscarAssinaturas({ usuarioId: faker.string.uuid() })).toHaveLength(0);
    });
  });

  describe('processar()', () => {
    it('deve retornar um erro se assintura não for encontrada', async () => {
      expect(service.processar(faker.string.uuid())).rejects.toBeInstanceOf(AssinaturaError);
    });

    it('deve lançar debitos em assinaturas sem termino', async () => {
      let assinatura = await service.inscrever(usuario, plano.id);

      await assinaturaRepo.save(Object.assign(assinatura, { inicio_em: dayjs().subtract(3, 'month').toDate() }));

      await service.processar(assinatura.id).then((operacoes) => expect(operacoes).toHaveLength(4));
      await service.processar(assinatura.id).then((operacoes) => expect(operacoes).toHaveLength(0));
    });

    it('lançamentos de debitos devem respeitar termino', async () => {
      let assinatura = await service.inscrever(usuario, plano.id, { duracaoEmMeses: 2 });

      await assinaturaRepo.save(
        Object.assign(assinatura, {
          inicio_em: dayjs().subtract(3, 'month').toDate(),
          fim_em: dayjs(assinatura.fim_em).subtract(3, 'month').toDate(),
        }),
      );

      await service.processar(assinatura.id).then((operacoes) => expect(operacoes).toHaveLength(2));
      await service.processar(assinatura.id).then((operacoes) => expect(operacoes).toHaveLength(0));
    });

    it('deve encerrar assinatura se prazo foi encerrado', async () => {
      let assinatura = await service.inscrever(usuario, plano.id, { duracaoEmMeses: 2 });

      await assinaturaRepo.save(
        Object.assign(assinatura, {
          inicio_em: dayjs().subtract(3, 'month').toDate(),
          fim_em: dayjs(assinatura.fim_em).subtract(3, 'month').toDate(),
        }),
      );

      await service.processar(assinatura.id);

      await expect(service.encerrar(assinatura.id, 'finalizacao')).rejects.toBeDefined();
    });

    it('deve estornar valor se for cancelamento', async () => {
      let assinatura = await service.inscrever(usuario, plano.id, { duracaoEmMeses: 2 });

      assinatura = await assinaturaRepo.save(
        Object.assign(assinatura, {
          status: 'cancelada',
          encerrada_em: new Date(),
        }),
      );

      await service.processar(assinatura.id).then((operacoes) => {
        expect(operacoes).toHaveLength(1);
        expect(operacoes.at(0)).toHaveProperty('valor', plano.valor);
      });
    });
  });
});
