import { faker } from '@faker-js/faker';

import { Plano } from './Plano';

describe('Testa entidade Plano', () => {
  it('toJSON deve retornar um objeto com os dados', () => {
    const data: ConstructorParameters<typeof Plano>[0] = {
      nome: faker.string.sample(),
      descricao: faker.string.sample(),
      valor: faker.number.float(),
    };
    expect(new Plano(data).toJSON()).toEqual({ ...data, ativo: true });
  });
});
