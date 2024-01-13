import { faker } from '@faker-js/faker';

import { Plano } from './Plano';

describe('Plano', () => {
  const dados = { nome: faker.string.sample(), descricao: faker.lorem.paragraph(), valor: faker.number.float() };

  it('deve aceitar somente valores positivos maiores que zero', () => {
    expect(() => new Plano({ ...dados, valor: -1 })).toThrow();
    expect(() => new Plano({ ...dados, valor: -0.01 })).toThrow();
    expect(() => new Plano({ ...dados, valor: 0 })).toThrow();
    expect(() => new Plano({ ...dados, valor: 0.01 })).not.toThrow();
    expect(() => new Plano({ ...dados, valor: 1 })).not.toThrow();
  });

  it('deve estar ativo por padrão', () => {
    expect(new Plano(dados)).toHaveProperty('ativo', true);
  });

  it('deve retornar todos os campos no método toJSON', () => {
    expect(new Plano(dados).toJSON()).toEqual({
      id: undefined,
      nome: dados.nome,
      descricao: dados.descricao,
      valor: dados.valor,
      ativo: true,
    });
  });
});
