import { faker } from '@faker-js/faker';
import { StatusCodes } from 'http-status-codes';
import { after } from 'node:test';
import supertest from 'supertest';

import { createApp } from '../app';
import { tokens, tokensPayload } from '../middlewares/__mocks__/auth';
import { AppDataSource } from '../utils/data-source';
import { createRouter } from './PlanoController';

jest.mock('../middlewares/auth');

describe('Testa PlanoController', () => {
  const sample = { nome: faker.string.sample(), descricao: faker.string.sample(), valor: faker.number.float() };

  const app = createApp([{ path: '/', router: createRouter() }]);

  beforeAll(async () => AppDataSource.initialize());
  afterAll(async () => AppDataSource.destroy());

  afterEach(async () => AppDataSource.dropDatabase().then(() => AppDataSource.synchronize()));

  it('deve retornar 401 para POST /', async () => {
    await supertest(app).post('/').expect(StatusCodes.UNAUTHORIZED);
    await supertest(app).post('/').auth('invalid', { type: 'bearer' }).expect(StatusCodes.UNAUTHORIZED);
  });

  it('deve retornar 401 para PATCH /:id', async () => {
    await supertest(app).patch('/:id').expect(StatusCodes.UNAUTHORIZED);
    await supertest(app).patch('/:id').auth('invalid', { type: 'bearer' }).expect(StatusCodes.UNAUTHORIZED);
  });

  it('somente admins podem criar e atualizar planos', async () => {
    await supertest(app).post('/').auth(tokens.user, { type: 'bearer' }).expect(StatusCodes.UNAUTHORIZED);

    await supertest(app).post('/').auth(tokens.admin, { type: 'bearer' }).expect(StatusCodes.BAD_REQUEST);

    const plano = await supertest(app)
      .post('/')
      .auth(tokens.admin, { type: 'bearer' })
      .send(sample)
      .expect(StatusCodes.CREATED)
      .then(({ body }) => body);

    expect(plano).toEqual({ id: expect.any(String), ativo: true, ...sample });

    await supertest(app).patch(`/${plano.id}`).auth(tokens.user, { type: 'bearer' }).expect(StatusCodes.UNAUTHORIZED);

    const plano2 = await supertest(app)
      .patch(`/${plano.id}`)
      .auth(tokens.admin, { type: 'bearer' })
      .send({ ativo: false })
      .expect(StatusCodes.OK)
      .then(({ body }) => body);

    expect(plano2).toEqual({ id: plano.id, ...sample, ativo: false });
  });

  it('deve permitir obter um plano pelo id', async () => {
    await supertest(app).get(`/${faker.string.uuid()}`).expect(StatusCodes.NOT_FOUND);

    const plano = await supertest(app)
      .post('/')
      .auth(tokens.admin, { type: 'bearer' })
      .send(sample)
      .expect(StatusCodes.CREATED)
      .then(({ body }) => body);

    await supertest(app).get(`/${plano.id}`).expect(StatusCodes.OK).expect(plano);
  });

  it('deve retornar todos os planos ativos', async () => {
    await supertest(app).get('/').expect(StatusCodes.OK).expect([]);

    const data = await Promise.all(
      Array(3)
        .fill(null)
        .map(() =>
          supertest(app)
            .post('/')
            .auth(tokens.admin, { type: 'bearer' })
            .send(sample)
            .expect(StatusCodes.CREATED)
            .then(({ body }) => body),
        ),
    );

    await supertest(app).get('/').expect(StatusCodes.OK).expect(data);

    await supertest(app)
      .patch(`/${data.shift().id}`)
      .auth(tokens.admin, { type: 'bearer' })
      .send({ ativo: false })
      .expect(StatusCodes.OK);

    await supertest(app).get('/').expect(StatusCodes.OK).expect(data);
  });
});
