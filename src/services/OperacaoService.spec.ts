import { faker } from '@faker-js/faker';
import { Repository } from 'typeorm';

import { Credito } from '../entities/Credito';
import { Debito } from '../entities/Debito';
import { Operacao } from '../entities/Operacao';
import { NotFoundError } from '../utils/errors';
import { OperacaoService } from './OperacaoService';
import { createMockedRepository } from './__mocks__/typeorm.mock';

function criaDadosFakeDebito(dest?: string): ConstructorParameters<typeof Debito>[0] {
  return {
    valor: faker.number.float({ min: 1, max: 100, precision: 2 }),
    usuario: dest || faker.string.uuid(),
    emissor: faker.string.uuid(),
    descricao: faker.lorem.sentence(),
    referencia: faker.string.alphanumeric(20),
  };
}

function criaDadosFakeCredito(dest?: string): ConstructorParameters<typeof Credito>[0] {
  return {
    valor: faker.number.float({ min: 1, max: 100, precision: 2 }),
    usuario: dest || faker.string.uuid(),
    emissor: faker.string.uuid(),
    descricao: faker.lorem.sentence(),
    referencia: faker.string.alphanumeric(20),
    comprovante: faker.system.filePath(),
  };
}

describe('Testa OperacaoService', () => {
  const repoMock = createMockedRepository<Operacao>();

  beforeEach(() => repoMock._clear());

  {
    const service = new OperacaoService({
      repository: repoMock,
      fileService: { save: jest.fn().mockResolvedValue(void 0) },
    });

    it('deve permitir debitar valores', async () => {
      const usuario = faker.string.uuid();

      let saldo = 0;

      for (let i = 1; i <= 5; i++) {
        const debito = criaDadosFakeDebito(usuario);

        let resumo = await service.resumoPorUsuario(usuario);
        expect(resumo.saldo).toBe(saldo);

        const debitoFinal = await service.debitar(debito);
        saldo -= debito.valor;

        expect(debitoFinal.id).toBeDefined();

        const uTrans = await service.buscarPorUsuario(usuario);

        expect(uTrans).toHaveLength(i);
        expect(uTrans.includes(debitoFinal)).toBeTruthy();

        resumo = await service.resumoPorUsuario(debito.usuario);
        expect(resumo.saldo).toBe(saldo);
      }
    });

    it('deve permitir o deposito e revisao de valores', async () => {
      const usuario = faker.string.uuid();

      const ids: Array<string> = [];

      let pendente = 0;

      for (let i = 1; i <= 5; i++) {
        const credito = criaDadosFakeCredito(usuario);

        let resumo = await service.resumoPorUsuario(usuario);
        expect(resumo.saldo).toBe(0);
        expect(resumo.pendente).toBe(pendente);

        const creditoFinal = await service.creditar({
          ...credito,
          comprovante: { name: faker.system.fileName(), data: Buffer.from(faker.system.filePath()) },
        });

        pendente += credito.valor;
        ids.push(creditoFinal.id);

        expect(creditoFinal.id).toBeDefined();

        const uTrans = await service.buscarPorUsuario(usuario);

        expect(uTrans).toHaveLength(i);
        expect(uTrans.includes(creditoFinal)).toBeTruthy();

        resumo = await service.resumoPorUsuario(usuario);
        expect(resumo.saldo).toBe(0);
        expect(resumo.pendente).toBe(pendente);
      }

      let saldo = 0;

      for (let i = 1; i <= 5; i++) {
        const operacao = ids[i - 1];

        const status = i % 2 === 0 ? 'aprovado' : 'rejeitado';

        const uTrans = await service.revisar(operacao, { status, revisado_por: faker.string.uuid() });
        if (status === 'aprovado') saldo += uTrans.valor;

        pendente -= uTrans.valor;

        const resumo = await service.resumoPorUsuario(usuario);
        expect(resumo.saldo).toBe(saldo);
        expect(resumo.pendente).toBe(pendente);
      }
    });

    it('deve lançar erro ao revisar deposito invalido', () => {
      expect(
        service.revisar(faker.string.uuid(), { status: 'aprovado', revisado_por: faker.string.uuid() }),
      ).rejects.toThrow(NotFoundError);
    });
  }

  {
    const service = new OperacaoService({
      repository: repoMock,
      fileService: { save: jest.fn().mockRejectedValue(new Error('Unknown error')) },
    });

    it('deve remover entrada se erro ao salvar comprovante', async () => {
      await expect(
        service.creditar({
          ...criaDadosFakeCredito(),
          comprovante: { name: faker.system.fileName(), data: Buffer.from(faker.system.filePath()) },
        }),
      ).rejects.toThrow('Unknown error');

      expect(repoMock._data()).toHaveLength(0);
    });
  }
});
