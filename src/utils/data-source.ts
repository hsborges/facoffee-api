import { sync } from 'fast-glob';
import path from 'path';
import { DataSource } from 'typeorm';

const entities = sync('*.{js,ts}', {
  cwd: path.join(__dirname, '..', 'entities'),
  ignore: ['*.{spec,ts}.{js,ts}'],
  absolute: true,
});

export const AppDataSource = new DataSource({
  ...(process.env.NODE_ENV === 'test'
    ? {
        type: 'better-sqlite3',
        database: ':memory:',
      }
    : {
        type: 'postgres',
        url: process.env.DATABASE_URL,
        logging: false,
        extra: { max: 5 },
      }),
  synchronize: true,
  entitySkipConstructor: true,
  entities,
});
