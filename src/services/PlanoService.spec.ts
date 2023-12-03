import { Plano } from '../entities/Plano';
import { PlanoService } from './PlanoService';
import { createMockedRepository } from './__mokcs__/typeorm.mock';

describe('Testa PlanoService', () => {
  const repository = createMockedRepository<Plano>();
  const service = new PlanoService(repository);

  beforeEach(() => repository.clearMock());

  it('deve realizar atividades básicas (salvar, listar, atualizar, remover)', async () => {
    const data = await Promise.all(
      [
        new Plano({ nome: 'Plano 1', descricao: 'Descrição do plano 1', valor: 100 }),
        new Plano({ nome: 'Plano 2', descricao: 'Descrição do plano 2', valor: 200 }),
        new Plano({ nome: 'Plano 3', descricao: 'Descrição do plano 3', valor: 300 }),
      ].map((d) => repository.save(d)),
    );

    await expect(service.listar()).resolves.toEqual(data);

    const first = data.at(0) as Plano;

    await expect(service.atualizar(first.id, { ativo: false })).resolves.toHaveProperty('ativo', false);
    await expect(service.listar()).resolves.toHaveLength(data.length - 1);

    await expect(service.listar(true)).resolves.toHaveLength(data.length);

    await expect(service.remover(first.id)).resolves.toBeUndefined();
    await expect(service.listar(true)).resolves.toHaveLength(data.length - 1);
  });
});
