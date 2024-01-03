import { faker } from '@faker-js/faker';
import { StatusCodes } from 'http-status-codes';
import supertest from 'supertest';
import { FileResult, dirSync, file, withFile } from 'tmp-promise';

import { createApp } from '../app';
import { Credito } from '../entities/Credito';
import { tokens, tokensPayload } from '../middlewares/__mocks__/auth';
import { LocalFileService } from '../services/FileService';
import { OperacaoService } from '../services/OperacaoService';
import { AppDataSource } from '../utils/data-source';
import { createRouter } from './OperacaoController';

jest.mock('../middlewares/auth');

describe('Testa o controller de operações financeiras', () => {
  const { name, removeCallback } = dirSync({ unsafeCleanup: true });

  const service = new OperacaoService({ fileService: new LocalFileService(name) });
  const app = createApp([{ path: '/', router: createRouter(service) }]);

  const caminhos = {
    '/saldo': () => supertest(app).get('/saldo'),
    '/extrato': () => supertest(app).get('/extrato'),
    '/credito': () => supertest(app).post('/credito'),
    '/credito/:id': (id?: string) => supertest(app).patch(`/credito/${id || faker.string.uuid()}`),
    '/debito': () => supertest(app).post('/debito'),
  };

  afterAll(() => removeCallback());

  beforeEach(async () => AppDataSource.synchronize(true));

  describe('Verifica autenticação das rotas', () => {
    it('deve retornar 401 se nenhum token for fornecido', async () => {
      for (const test of Object.values(caminhos)) {
        await test().expect(StatusCodes.UNAUTHORIZED);
      }
    });

    it('deve retornar 401 se token invalido for fornecido', async () => {
      for (const test of Object.values(caminhos)) {
        await test().auth(faker.string.alphanumeric(100), { type: 'bearer' }).expect(StatusCodes.UNAUTHORIZED);
      }
    });
  });

  describe('Verifica a rota GET /saldo', () => {
    it('deve retornar 200 com o saldo do usuário', async () => {
      const [c1, c2] = await Promise.all([
        service.creditar({
          valor: faker.number.int({ min: 0, max: 100 }),
          referencia: faker.string.hexadecimal(),
          usuario: tokensPayload.user.sub,
          emissor: tokensPayload.user.sub,
          comprovante: { name: faker.system.fileName(), data: Buffer.from('') },
        }),
        service.creditar({
          valor: faker.number.float({ min: 0, max: 10 }),
          referencia: faker.string.hexadecimal(),
          usuario: tokensPayload.user.sub,
          emissor: tokensPayload.user.sub,
          comprovante: { name: faker.system.fileName(), data: Buffer.from('') },
        }),
      ]);

      await caminhos['/saldo']()
        .auth(tokens.user, { type: 'bearer' })
        .expect(StatusCodes.OK)
        .expect({ saldo: 0, pendente: c1.valor + c2.valor });

      await service.revisar(c1.id, { status: 'aprovado', revisado_por: tokensPayload.admin.sub });

      await caminhos['/saldo']()
        .auth(tokens.user, { type: 'bearer' })
        .expect(StatusCodes.OK)
        .expect({ saldo: c1.valor, pendente: c2.valor });

      await service.revisar(c2.id, { status: 'rejeitado', revisado_por: tokensPayload.admin.sub });

      await caminhos['/saldo']()
        .auth(tokens.user, { type: 'bearer' })
        .expect(StatusCodes.OK)
        .expect({ saldo: c1.valor, pendente: 0 });
    });

    it('deve calcular o saldo somente com base nas próprias operações', async () => {
      const c = await service.creditar({
        valor: faker.number.int({ min: 0, max: 100 }),
        referencia: faker.string.hexadecimal(),
        usuario: tokensPayload.admin.sub,
        emissor: tokensPayload.admin.sub,
        comprovante: { name: faker.system.fileName(), data: Buffer.from('') },
      });

      await caminhos['/saldo']()
        .auth(tokens.admin, { type: 'bearer' })
        .expect(StatusCodes.OK)
        .expect({ saldo: 0, pendente: c.valor });

      await caminhos['/saldo']()
        .auth(tokens.user, { type: 'bearer' })
        .expect(StatusCodes.OK)
        .expect({ saldo: 0, pendente: 0 });
    });

    it('deve permitir consultar saldo de outros usuários se admin', async () => {
      await caminhos['/saldo']()
        .query({ usuario: faker.string.uuid() })
        .auth(tokens.admin, { type: 'bearer' })
        .expect(StatusCodes.OK)
        .expect({ saldo: 0, pendente: 0 });

      await caminhos['/saldo']()
        .query({ usuario: faker.string.uuid() })
        .auth(tokens.user, { type: 'bearer' })
        .expect(StatusCodes.UNAUTHORIZED);
    });

    it('deve retornar 400 se o destinatário não for um uuid', async () => {
      await caminhos['/saldo']()
        .query({ usuario: faker.string.sample(36) })
        .auth(tokens.admin, { type: 'bearer' })
        .expect(StatusCodes.BAD_REQUEST);
    });
  });

  describe('Verifica a rota GET /extrato', () => {
    it('deve retornar 200 com o extrato do usuário', async () => {
      const c = await service.creditar({
        valor: faker.number.int({ min: 0, max: 100 }),
        referencia: faker.string.hexadecimal(),
        usuario: tokensPayload.admin.sub,
        emissor: tokensPayload.admin.sub,
        comprovante: { name: faker.system.fileName(), data: Buffer.from('') },
      });

      await caminhos['/extrato']().auth(tokens.user, { type: 'bearer' }).expect(StatusCodes.OK).expect([]);

      await caminhos['/extrato']()
        .auth(tokens.admin, { type: 'bearer' })
        .expect(StatusCodes.OK)
        .expect(JSON.parse(JSON.stringify([c.toJSON()])));
    });

    it('deve permitir obter extrato de outros usuários se admin', async () => {
      await caminhos['/extrato']()
        .query({ usuario: faker.string.uuid() })
        .auth(tokens.admin, { type: 'bearer' })
        .expect(StatusCodes.OK)
        .expect([]);

      await caminhos['/extrato']()
        .query({ usuario: faker.string.uuid() })
        .auth(tokens.user, { type: 'bearer' })
        .expect(StatusCodes.UNAUTHORIZED);
    });

    it('deve retornar 400 se o destinatário não for um uuid', async () => {
      await caminhos['/extrato']()
        .query({ usuario: faker.string.sample(36) })
        .auth(tokens.admin, { type: 'bearer' })
        .expect(StatusCodes.BAD_REQUEST);
    });
  });

  describe('Verifica a rota POST /debito', () => {
    const validDebitoData = {
      usuario: faker.string.uuid(),
      valor: faker.number.float(),
      referencia: faker.string.hexadecimal(),
      descricao: faker.lorem.sentence(),
    };

    it('deve permitir somente usuários admin', async () => {
      await caminhos['/debito']()
        .auth(tokens.user, { type: 'bearer' })
        .send(validDebitoData)
        .expect(StatusCodes.UNAUTHORIZED);
    });

    it('deve fazer a validação dos dados recebidos', async () => {
      const sendRequest = async (data: any) =>
        caminhos['/debito']().auth(tokens.admin, { type: 'bearer' }).send(data).expect(StatusCodes.BAD_REQUEST);

      await sendRequest({ ...validDebitoData, usuario: undefined });
      await sendRequest({ ...validDebitoData, usuario: faker.string.sample(36) });
      await sendRequest({ ...validDebitoData, valor: undefined });
      await sendRequest({ ...validDebitoData, valor: -faker.number.float() });
      await sendRequest({ ...validDebitoData, referencia: undefined });
    });

    it('deve gerar debito para usuário', async () => {
      let debito: Record<string, any> | null = null;

      await caminhos['/debito']()
        .auth(tokens.admin, { type: 'bearer' })
        .send(validDebitoData)
        .expect(StatusCodes.CREATED)
        .expect(({ body }) => {
          debito = body;
          expect(body).toHaveProperty('id');
          expect(body).toHaveProperty('usuario', validDebitoData.usuario);
          expect(body).toHaveProperty('emissor', tokensPayload.admin.sub);
          expect(body).toHaveProperty('valor', validDebitoData.valor);
          expect(body).toHaveProperty('referencia', validDebitoData.referencia);
          expect(body).toHaveProperty('descricao', validDebitoData.descricao);
        });

      await caminhos['/saldo']()
        .auth(tokens.admin, { type: 'bearer' })
        .query({ usuario: validDebitoData.usuario })
        .expect(StatusCodes.OK, { saldo: -validDebitoData.valor, pendente: 0 });

      await caminhos['/extrato']()
        .auth(tokens.admin, { type: 'bearer' })
        .query({ usuario: validDebitoData.usuario })
        .expect(StatusCodes.OK, [debito]);
    });
  });

  describe('Verifica a rota POST /credito', () => {
    let tmpFile: FileResult | null = null;

    const validDebitoData: Record<string, any> = {
      valor: faker.number.float(),
      referencia: faker.string.hexadecimal(),
      descricao: faker.lorem.sentence(),
    };

    beforeAll(async () => (tmpFile = await file({ postfix: '.pdf' })));
    afterAll(async () => tmpFile?.cleanup());

    it('deve fazer a validação dos dados recebidos', async () => {
      const sendRequest = async (data: Record<string, any>, attach = true) => {
        let req = caminhos['/credito']().auth(tokens.admin, { type: 'bearer' });

        if (attach) req.attach('comprovante', tmpFile?.path || '');

        for (const [key, value] of Object.entries(data)) {
          if (value) req = req.field(key, value);
        }

        return req.expect(StatusCodes.BAD_REQUEST);
      };

      await sendRequest({ ...validDebitoData, usuario: faker.string.sample(36) });
      await sendRequest({ ...validDebitoData, valor: undefined });
      await sendRequest({ ...validDebitoData, valor: -faker.number.float() });
      await sendRequest({ ...validDebitoData, referencia: undefined });
      await sendRequest(validDebitoData, false);
    });

    it('deve gerar credito para usuário', async () => {
      let credito: Record<string, any> | null = null;

      await caminhos['/credito']()
        .auth(tokens.user, { type: 'bearer' })
        .field('valor', validDebitoData.valor)
        .field('referencia', validDebitoData.referencia)
        .field('descricao', validDebitoData.descricao)
        .attach('comprovante', tmpFile?.path || '')
        .expect(StatusCodes.CREATED)
        .expect(({ body }) => {
          credito = body;
          expect(body).toHaveProperty('id');
          expect(body).toHaveProperty('usuario', tokensPayload.user.sub);
          expect(body).toHaveProperty('emissor', tokensPayload.user.sub);
          expect(body).toHaveProperty('valor', validDebitoData.valor);
          expect(body).toHaveProperty('referencia', validDebitoData.referencia);
          expect(body).toHaveProperty('descricao', validDebitoData.descricao);
        });

      await caminhos['/saldo']()
        .auth(tokens.user, { type: 'bearer' })
        .expect(StatusCodes.OK, { saldo: 0, pendente: validDebitoData.valor });

      await caminhos['/extrato']().auth(tokens.user, { type: 'bearer' }).expect(StatusCodes.OK, [credito]);
    });
  });

  describe('Verifica a rota PATCH /credito/:id', () => {
    it('deve permitir somente usuários admin', async () => {
      await caminhos['/credito/:id']().auth(tokens.user, { type: 'bearer' }).expect(StatusCodes.UNAUTHORIZED);
    });

    it('deve permitir aprovar e rejeitar creditos', async () => {
      await withFile(
        async ({ path }) => {
          let credito: Credito | undefined;

          await caminhos['/credito']()
            .auth(tokens.user, { type: 'bearer' })
            .field('valor', faker.number.float())
            .field('referencia', faker.string.hexadecimal())
            .attach('comprovante', path)
            .expect(StatusCodes.CREATED)
            .expect(({ body }) => (credito = body));

          if (!credito) throw new Error('Credito não foi criado');

          await caminhos['/credito/:id'](credito.id)
            .auth(tokens.admin, { type: 'bearer' })
            .send({ status: 'ok' })
            .expect(StatusCodes.BAD_REQUEST);

          await caminhos['/credito/:id'](credito.id)
            .auth(tokens.admin, { type: 'bearer' })
            .send({ status: 'aprovado' })
            .expect(StatusCodes.OK)
            .expect(({ body }) => {
              expect(body).toHaveProperty('status', 'aprovado');
              expect(body).toHaveProperty('revisado_em');
              expect(body).toHaveProperty('revisado_por', tokensPayload.admin.sub);
            });

          await caminhos['/credito/:id'](credito.id)
            .auth(tokens.admin, { type: 'bearer' })
            .send({ status: 'rejeitado' })
            .expect(StatusCodes.OK)
            .expect(({ body }) => {
              expect(body).toHaveProperty('status', 'rejeitado');
              expect(body).toHaveProperty('revisado_em');
              expect(body).toHaveProperty('revisado_por', tokensPayload.admin.sub);
            });
        },
        { postfix: '.pdf' },
      );
    });
  });
});
