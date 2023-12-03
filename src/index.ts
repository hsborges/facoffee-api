import consola from 'consola';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';

import { createApp } from './app';
import { createRouter } from './controllers/OperacaoController';
import { AppDataSource } from './utils/data-source';

const PORT = process.env.PORT || 8080;
const definition = YAML.load('./docs.yaml');

definition.servers = [{ url: process.env.BASE_URL || `http://localhost:${PORT}/api` }];

const app = createApp([
  { path: '/docs', router: [...swaggerUi.serve, swaggerUi.setup(definition)] },
  { path: '/api/transacoes', router: createRouter() },
]);

AppDataSource.initialize().then(() =>
  app
    .listen(PORT, () => consola.success(`Server listening at http://localhost:${PORT}`))
    .on('close', () => AppDataSource.destroy()),
);
