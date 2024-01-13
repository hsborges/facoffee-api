import { faker } from '@faker-js/faker';
import { EntityNotFoundError } from 'typeorm';

import { Plano } from '../entities/Plano';
import { AppDataSource } from '../utils/data-source';
import { PlanoService } from './PlanoService';

describe('Testa PlanoService', () => {
  const repository = AppDataSource.getRepository(Plano);
  const service = new PlanoService({ repository });

  beforeEach(() => repository.clear());

  it('deve criar um plano', async () => {
    const data = { nome: faker.string.sample(), descricao: faker.string.sample(), valor: faker.number.float() };
    const instancia = await service.criar(data);
    expect(instancia).toBeInstanceOf(Plano);
    expect(instancia).toHaveProperty('id');
    expect(instancia).toHaveProperty('nome', data.nome);
    expect(instancia).toHaveProperty('descricao', data.descricao);
    expect(instancia).toHaveProperty('valor', data.valor);
    expect(instancia).toHaveProperty('ativo', true);

    await expect(repository.find()).resolves.toEqual([instancia]);
  });

  it('deve buscar um plano por id', async () => {
    const fakePlano = await repository.save(
      new Plano({ nome: faker.string.sample(), descricao: faker.string.sample(), valor: faker.number.float() }),
    );

    await expect(service.buscarPorId(fakePlano.id)).resolves.toEqual(fakePlano);
  });

  it('deve listar planos', async () => {
    const data = await Promise.all(
      Array(3)
        .fill(null)
        .map((d) =>
          repository.save(
            new Plano({ nome: faker.string.sample(), descricao: faker.string.sample(), valor: faker.number.float() }),
          ),
        ),
    );

    await service.listar(true).then((planos) => {
      expect(planos).toHaveLength(data.length);
      expect(planos).toEqual(expect.arrayContaining(data));
    });

    await repository.save(Object.assign(data.shift() as Plano, { ativo: false }));

    await service.listar(false).then((planos) => {
      expect(planos).toHaveLength(data.length);
      expect(planos).toEqual(expect.arrayContaining(data));
    });
  });

  it('deve atualizar um plano', async () => {
    await expect(service.atualizar(faker.string.uuid(), { ativo: false })).rejects.toBeInstanceOf(EntityNotFoundError);

    const fakePlano = await repository.save(
      new Plano({ nome: faker.string.sample(), descricao: faker.string.sample(), valor: faker.number.float() }),
    );

    await expect(service.atualizar(fakePlano.id, { ativo: false })).resolves.toHaveProperty('ativo', false);
    await expect(service.atualizar(fakePlano.id, { ativo: true })).resolves.toHaveProperty('ativo', true);
  });

  it('deve remover um plano', async () => {
    const fakePlano = await repository.save(
      new Plano({ nome: faker.string.sample(), descricao: faker.string.sample(), valor: faker.number.float() }),
    );

    await expect(service.buscarPorId(fakePlano.id)).resolves.toEqual(fakePlano);
    await expect(service.remover(fakePlano.id)).resolves.toBeUndefined();
    await expect(service.buscarPorId(fakePlano.id)).resolves.toBeNull();
  });
});
