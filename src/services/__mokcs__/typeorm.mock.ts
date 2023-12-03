import { faker } from '@faker-js/faker';
import { ObjectLiteral, Repository } from 'typeorm';

export function createMockedRepository<T extends ObjectLiteral>(): Repository<T> & { clearMock: () => void } {
  let data: Array<T> = [];

  return {
    findBy: jest.fn().mockImplementation(async (query) => {
      return data.filter((t: Record<string, any>) => {
        for (const key in query) {
          if (t[key] !== query[key]) return false;
        }
        return true;
      });
    }),
    findOneBy: jest.fn().mockImplementation(async (query) => {
      return data.find((t: Record<string, any>) => {
        for (const key in query) {
          if (t[key] !== query[key]) return false;
        }
        return true;
      });
    }),
    save: jest.fn().mockImplementation((t: T) => {
      if (!t.id) data.push(Object.assign(t, t.id ? {} : { id: faker.string.uuid() }));
      else data[data.findIndex((t2) => t2.id === t.id)] = t;
      return t;
    }),
    merge: jest.fn().mockImplementation((t: T, data: Partial<T>) => {
      return Object.assign(t, data);
    }),
    delete: jest.fn().mockImplementation((query) => {
      data = data.filter((t: Record<string, any>) => {
        for (const key in query) {
          if (t[key] !== query[key]) return true;
        }
        return false;
      });
    }),
    clearMock: () => (data = []),
  } as any;
}
