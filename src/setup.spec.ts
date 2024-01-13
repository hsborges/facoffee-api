import { AppDataSource } from './utils/data-source';

beforeAll(async () => AppDataSource.initialize());
afterAll(async () => AppDataSource.destroy());
