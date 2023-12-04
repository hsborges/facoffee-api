import { faker } from '@faker-js/faker';
import { ObjectLiteral, Repository } from 'typeorm';

export function createMockedRepository<T extends ObjectLiteral>(): Repository<T> & {
  _clear: () => void;
  _data: () => Array<T>;
} {
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
      return (
        data.find((t: Record<string, any>) => {
          for (const key in query) {
            if (t[key] !== query[key]) return false;
          }
          return true;
        }) || null
      );
    }),
    save: jest.fn().mockImplementation((t: T) => {
      if (!t.id) data.push(Object.assign(t, { id: faker.string.uuid() }));
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
    remove: jest.fn().mockImplementation((t: T) => {
      data = data.filter((t2) => t2.id !== t.id);
    }),
    _clear: () => (data = []),
    _data: () => data,
  } as any;
}
