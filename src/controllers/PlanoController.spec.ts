import { faker } from '@faker-js/faker';
import { StatusCodes } from 'http-status-codes';
import supertest from 'supertest';

import { createApp } from '../app';
import { Plano } from '../entities/Plano';
import { tokens } from '../middlewares/__mocks__/auth';
import { AppDataSource } from '../utils/data-source';
import { createRouter } from './PlanoController';

jest.mock('../middlewares/auth');

describe('Testa PlanoController', () => {
  const repository = AppDataSource.getRepository(Plano);
  const sample = { nome: faker.string.sample(), descricao: faker.string.sample(), valor: faker.number.float() };

  const app = createApp([{ path: '/', router: createRouter() }]);

  const planoDataFormat: ReturnType<Plano['toJSON']> = {
    id: expect.any(String),
    nome: expect.any(String),
    descricao: expect.any(String),
    valor: expect.any(Number),
    ativo: expect.any(Boolean),
  };

  beforeAll(async () => AppDataSource.initialize());
  afterAll(async () => AppDataSource.destroy());

  afterEach(async () => AppDataSource.dropDatabase().then(() => AppDataSource.synchronize()));

  describe('GET /', () => {
    it('deve retornar vazio se não houver planos', async () => {
      await supertest(app).get('/').expect(StatusCodes.OK).expect([]);
    });

    it('deve retornar, por padrão, planos ativos', async () => {
      let data = await repository.save(new Plano(sample));
      await supertest(app).get('/').expect(StatusCodes.OK).expect([data.toJSON()]);
      data = await repository.save(repository.merge(data, { ativo: false }));
      await supertest(app).get('/').expect(StatusCodes.OK).expect([]);
    });

    it('deve retornar todos planos todos=true', async () => {
      const data = await Promise.all(
        Array(3)
          .fill(null)
          .map((_, index) =>
            AppDataSource.getRepository(Plano).save(
              repository.merge(new Plano(sample), index === 0 ? { ativo: false } : {}),
            ),
          ),
      );

      const { body: result } = await supertest(app).get('/').query({ todos: true }).expect(StatusCodes.OK);

      expect(result).toEqual(expect.arrayContaining(data.map((d) => d.toJSON())));
    });
  });

  describe('POST /', () => {
    it('deve retornar 401 se não autenticado', async () => {
      await supertest(app).post('/').expect(StatusCodes.UNAUTHORIZED);
      await supertest(app).post('/').auth('invalid', { type: 'bearer' }).expect(StatusCodes.UNAUTHORIZED);
    });

    it('somente admins podem criar planos', async () => {
      await supertest(app).post('/').auth(tokens.user, { type: 'bearer' }).expect(StatusCodes.UNAUTHORIZED);

      await supertest(app).post('/').auth(tokens.admin, { type: 'bearer' }).expect(StatusCodes.BAD_REQUEST);

      const plano = await supertest(app)
        .post('/')
        .auth(tokens.admin, { type: 'bearer' })
        .send(sample)
        .expect(StatusCodes.CREATED)
        .then(({ body }) => body);

      expect(plano).toEqual({ id: expect.any(String), ativo: true, ...sample });
    });

    it('deve validar os dados de entrada', async () => {
      const sendRequest = (data: Partial<typeof sample>) =>
        supertest(app)
          .post('/')
          .auth(tokens.admin, { type: 'bearer' })
          .send(Object.assign({}, sample, data));

      await sendRequest({ nome: undefined }).expect(StatusCodes.BAD_REQUEST);
      await sendRequest({ descricao: undefined }).expect(StatusCodes.BAD_REQUEST);
      await sendRequest({ valor: undefined }).expect(StatusCodes.BAD_REQUEST);
      await sendRequest({ valor: -faker.number.float() }).expect(StatusCodes.BAD_REQUEST);
    });
  });

  describe('PATCH /:id', () => {
    it('deve retornar 401 se não autenticado', async () => {
      await supertest(app).patch('/:id').expect(StatusCodes.UNAUTHORIZED);
      await supertest(app).patch('/:id').auth('invalid', { type: 'bearer' }).expect(StatusCodes.UNAUTHORIZED);
    });

    it('somente admins podem atualizar planos', async () => {
      const plano = await AppDataSource.getRepository(Plano).save(
        new Plano({ nome: faker.lorem.word(), descricao: faker.lorem.paragraphs(), valor: faker.number.float(10) }),
      );

      await supertest(app).patch(`/${plano.id}`).auth(tokens.user, { type: 'bearer' }).expect(StatusCodes.UNAUTHORIZED);

      await supertest(app)
        .patch(`/${plano.id}`)
        .auth(tokens.admin, { type: 'bearer' })
        .send({ ativo: false })
        .expect(StatusCodes.OK)
        .expect({ ...plano, ativo: false });
    });

    it('deve validar os dados de entrada', async () => {
      await supertest(app)
        .patch(`/${faker.string.uuid()}`)
        .auth(tokens.admin, { type: 'bearer' })
        .send(Object.assign({}, sample, { valor: -faker.number.float() }))
        .expect(StatusCodes.BAD_REQUEST);
    });
  });

  describe('GET /:id', () => {
    it('deve permitir obter um plano pelo id', async () => {
      await supertest(app).get(`/${faker.string.uuid()}`).expect(StatusCodes.NOT_FOUND);

      const plano = await AppDataSource.getRepository(Plano).save(
        new Plano({ nome: faker.lorem.word(), descricao: faker.lorem.paragraphs(), valor: faker.number.float(10) }),
      );

      await supertest(app).get(`/${plano.id}`).expect(StatusCodes.OK).expect(plano.toJSON());
    });
  });
});
