import { faker } from '@faker-js/faker';
import { StatusCodes } from 'http-status-codes';
import supertest from 'supertest';

import { createApp } from '../app';
import { Assinatura } from '../entities/Assinatura';
import { Plano } from '../entities/Plano';
import { tokens, tokensPayload } from '../middlewares/__mocks__/auth';
import { AppDataSource } from '../utils/data-source';
import { createRouter } from './AssinaturaController';

jest.mock('../middlewares/auth');

describe('Testa o controller de assinatura', () => {
  const planoRepo = AppDataSource.getRepository(Plano);
  const assinaturaRepo = AppDataSource.getRepository(Assinatura);

  const app = createApp([{ path: '/', router: createRouter() }]);

  beforeEach(async () => AppDataSource.synchronize(true));

  describe('POST /inscrever', () => {
    const sendRequest = (data?: Partial<{ plano: any; duracao: any }>) =>
      supertest(app)
        .post('/inscrever')
        .auth(tokens.user, { type: 'bearer' })
        .send(Object.assign({ plano: faker.string.uuid() }, data));

    it('deve estar autenticado', async () => {
      await supertest(app).post('/inscrever').expect(StatusCodes.UNAUTHORIZED);
    });

    it('deve validar os dados de entrada', async () => {
      await sendRequest({ plano: undefined }).expect(StatusCodes.BAD_REQUEST);
      await sendRequest({ plano: 'invalid-uuid' }).expect(StatusCodes.BAD_REQUEST);
      await sendRequest({ duracao: '1 mes' }).expect(StatusCodes.BAD_REQUEST);
    });

    it('deve inscrever usuarios se plano existe e usuário não já está inscrito', async () => {
      await sendRequest().expect(StatusCodes.BAD_REQUEST);

      const plano = await planoRepo.save(
        new Plano({
          nome: faker.lorem.word(),
          descricao: faker.lorem.paragraphs(),
          valor: faker.number.float(10),
        }),
      );

      const { body: assinatura } = await sendRequest({ plano: plano.id }).expect(StatusCodes.CREATED);

      expect(assinatura).toEqual({
        id: expect.any(String),
        usuario: tokensPayload.user.sub,
        plano: plano.id,
        inicio_em: expect.any(String),
        fim_em: null,
        status: 'ativa',
        encerrada_em: null,
      });

      await sendRequest({ plano: plano.id }).expect(StatusCodes.BAD_REQUEST);
    });
  });

  describe('POST /cancelar', () => {
    const sendRequest = () => supertest(app).post('/cancelar').auth(tokens.user, { type: 'bearer' });

    it('deve estar autenticado', async () => {
      await supertest(app).post('/cancelar').expect(StatusCodes.UNAUTHORIZED);
    });

    it('deve retornar 400 se usuario não tem inscrição ativa', async () => {
      await sendRequest().expect(StatusCodes.BAD_REQUEST);
    });

    it('deve cancelar a assinatura do usuario', async () => {
      const plano = await planoRepo.save(
        new Plano({
          nome: faker.lorem.word(),
          descricao: faker.lorem.paragraphs(),
          valor: faker.number.float(10),
        }),
      );

      await assinaturaRepo.save(new Assinatura({ plano, usuario: tokensPayload.user.sub }));

      const { body: assinatura } = await sendRequest().expect(StatusCodes.OK);

      expect(assinatura).toHaveProperty('status', 'cancelada');
      expect(assinatura).toHaveProperty('encerrada_em', expect.any(String));
    });
  });

  describe('GET /historico', () => {
    it('deve estar autenticado', async () => {
      await supertest(app).get('/historico').expect(StatusCodes.UNAUTHORIZED);
    });

    it('deve retornar as assinaturas do usuario', async () => {
      const plano = await planoRepo.save(
        new Plano({
          nome: faker.lorem.word(),
          descricao: faker.lorem.paragraphs(),
          valor: faker.number.float(10),
        }),
      );

      await assinaturaRepo.save(new Assinatura({ plano, usuario: tokensPayload.user.sub }).encerrar('finalizacao'));
      await assinaturaRepo.save(new Assinatura({ plano, usuario: tokensPayload.user.sub }).encerrar('cancelamento'));
      await assinaturaRepo.save(new Assinatura({ plano, usuario: tokensPayload.user.sub }));

      const { body: assinaturas } = await supertest(app)
        .get('/historico')
        .auth(tokens.user, { type: 'bearer' })
        .expect(StatusCodes.OK);

      expect(assinaturas).toHaveLength(3);
      expect(assinaturas).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ status: 'ativa' }),
          expect.objectContaining({ status: 'cancelada' }),
          expect.objectContaining({ status: 'finalizada' }),
        ]),
      );
    });
  });

  describe('GET /ultima', () => {
    const sendRequest = () => supertest(app).get('/ultima').auth(tokens.user, { type: 'bearer' });

    it('deve estar autenticado', async () => {
      await supertest(app).get('/ultima').expect(StatusCodes.UNAUTHORIZED);
    });

    it('deve retornar 404 se não tiver inscrições', async () => {
      await sendRequest().expect(StatusCodes.NOT_FOUND);
    });

    it('deve retornar ultima assinatura', async () => {
      const plano = await planoRepo.save(
        new Plano({
          nome: faker.lorem.word(),
          descricao: faker.lorem.paragraphs(),
          valor: faker.number.float(10),
        }),
      );

      await assinaturaRepo.save(new Assinatura({ plano, usuario: tokensPayload.user.sub }).encerrar('finalizacao'));
      const assinatura = await assinaturaRepo.save(
        new Assinatura({ plano, usuario: tokensPayload.user.sub }).encerrar('cancelamento'),
      );

      await sendRequest()
        .expect(StatusCodes.OK)
        .expect(JSON.parse(JSON.stringify(assinatura.toJSON())));
    });
  });
});
