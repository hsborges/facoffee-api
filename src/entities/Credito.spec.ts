import { faker } from '@faker-js/faker';

import { Credito } from './Credito';

describe('Testa entidade Credito', () => {
  const validSample: ConstructorParameters<typeof Credito>[0] = {
    usuario: faker.string.uuid(),
    emissor: faker.string.uuid(),
    referencia: faker.string.sample(20),
    valor: faker.number.float({ min: 0, max: 100 }),
    comprovante: faker.system.filePath(),
  };

  it('deveria ter status pendente ao ser criado', () => {
    expect(new Credito(validSample).status).toBe('pendente');
  });

  it('deveria alterar status ao revisar', () => {
    const credito = new Credito(validSample);

    const uuid = faker.string.uuid();
    credito.revisar('aprovado', uuid);
    const revisadoEm = credito.revisado_em?.getTime();

    expect(credito.status).toBe('aprovado');
    expect(credito.revisado_por).toBe(uuid);
    expect(revisadoEm).toBeLessThanOrEqual(Date.now());

    const newUuid = faker.string.uuid();
    credito.revisar('rejeitado', newUuid);
    expect(credito.status).toBe('rejeitado');
    expect(credito.revisado_por).toBe(newUuid);
    expect(credito.revisado_em?.getTime()).toBeGreaterThanOrEqual(revisadoEm as number);
  });

  it('deveria retornar a própria instancia ao revisar', () => {
    const credito = new Credito(validSample);
    expect(credito.revisar('aprovado', faker.string.uuid())).toBe(credito);
  });
});
