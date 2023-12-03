import { faker } from '@faker-js/faker';
import { Repository } from 'typeorm';

import { Credito } from '../entities/Credito';
import { Debito } from '../entities/Debito';
import { Operacao } from '../entities/Operacao';
import { NotFoundError } from '../utils/errors';
import { OperacaoService } from './OperacaoService';

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
  let db: Array<Operacao> = [];

  const repoMock = {
    save: jest.fn().mockImplementation((t: Operacao) => {
      if (!t.id) db.push(Object.assign(t, { id: faker.string.uuid() }));
      else db[db.findIndex((t2) => t2.id === t.id)] = t;
      return t;
    }),
    findBy: jest.fn().mockImplementation(async (query) => {
      return db.filter((t: Record<string, any>) => {
        for (const key in query) {
          if (t[key] !== query[key]) return false;
        }
        return true;
      });
    }),
    findOneBy: jest.fn().mockImplementation(async (query) => {
      return db.find((t: Record<string, any>) => {
        for (const key in query) {
          if (t[key] !== query[key]) return false;
        }
        return true;
      });
    }),
    manager: { transaction: jest.fn().mockImplementation((fn) => fn(repoMock)) },
  } as unknown as Repository<Operacao>;

  const service = new OperacaoService({
    repository: repoMock,
    fileService: { save: jest.fn().mockImplementation(async () => void 0) },
  });

  beforeEach(() => {
    db = [];
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
});
