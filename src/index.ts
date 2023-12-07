import consola from 'consola';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';

import { createApp } from './app';
import { createRouter as createAssinaturaRouter } from './controllers/AssinaturaController';
import { createRouter as createOperacoesRouter } from './controllers/OperacaoController';
import { createRouter as createPlanosRouter } from './controllers/PlanoController';
import { AppDataSource } from './utils/data-source';

const PORT = process.env.PORT || 8080;
const definition = YAML.load('./docs.yaml');

definition.servers = [{ url: process.env.BASE_URL || `http://localhost:${PORT}/api` }];

const app = createApp([
  { path: '/docs', router: [...swaggerUi.serve, swaggerUi.setup(definition)] },
  { path: '/api/operacoes', router: createOperacoesRouter() },
  { path: '/api/assinaturas', router: createAssinaturaRouter() },
  { path: '/api/planos', router: createPlanosRouter() },
]);

AppDataSource.initialize().then(() =>
  app
    .listen(PORT, () => consola.success(`Server listening at http://localhost:${PORT}`))
    .on('close', () => AppDataSource.destroy()),
);
