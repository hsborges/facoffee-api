import { faker } from '@faker-js/faker';
import e from 'express';

import { Assinatura } from './Assinatura';
import { Plano } from './Plano';

describe('Testa entidade Assinatura', () => {
  const amostra: ConstructorParameters<typeof Assinatura>[0] = {
    usuario: faker.string.uuid(),
    plano: new Plano({
      nome: faker.lorem.word(),
      descricao: faker.lorem.sentence(),
      valor: faker.number.float(),
    }),
    fim_em: faker.date.future(),
  };

  let assinatura: Assinatura;

  beforeEach(() => (assinatura = new Assinatura(amostra)));

  it('deve estar ativa por padrão', () => {
    expect(assinatura.status).toBe('ativa');
  });

  it('toJSON retorna objeto esperado', () => {
    expect(assinatura.toJSON()).toHaveProperty('id');
    expect(assinatura.toJSON()).toHaveProperty('usuario', amostra.usuario);
    expect(assinatura.toJSON()).toHaveProperty('plano', amostra.plano);
    expect(assinatura.toJSON()).toHaveProperty('fim_em', amostra.fim_em);
    expect(assinatura.toJSON()).toHaveProperty('inicio_em');
    expect(assinatura.toJSON()).toHaveProperty('status', 'ativa');
    expect(assinatura.toJSON()).toHaveProperty('encerrada_em', undefined);
  });

  it('deve mudar status quando cancelada', () => {
    assinatura.encerrar('cancelamento');

    expect(assinatura.status).toBe('cancelada');
    expect(assinatura.encerrada_em).toBeDefined();
  });

  it('deve mudar status quando finalizada', () => {
    assinatura.encerrar('finalizacao');

    expect(assinatura.status).toBe('finalizada');
    expect(assinatura.encerrada_em).toBeDefined();
  });

  it('deve lançar erro ao tentar encerrar assinatura já encerrada', () => {
    expect(() => assinatura.encerrar('cancelamento')).not.toThrow();
    expect(() => assinatura.encerrar('finalizacao')).toThrow();
  });
});
