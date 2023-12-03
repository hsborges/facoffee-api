import { DuplicatedError, HttpError, NotFoundError, ServerError, UnauthorizedError, ValidationError } from './errors';

describe('Testa HttpError e classes filhas', () => {
  it('filhos deve extender HttpError', () => {
    expect(new NotFoundError()).toBeInstanceOf(HttpError);
    expect(new DuplicatedError()).toBeInstanceOf(HttpError);
    expect(new UnauthorizedError()).toBeInstanceOf(HttpError);
    expect(new ValidationError()).toBeInstanceOf(HttpError);
    expect(new ServerError()).toBeInstanceOf(HttpError);
  });

  it('deve retornar 404 para NotFoundError', () => {
    expect(new NotFoundError()).toHaveProperty('code', 404);
    expect(NotFoundError.name).toBe('NotFoundError');
  });

  it('deve retornar 409 para DuplicatedError', () => {
    expect(new DuplicatedError()).toHaveProperty('code', 409);
    expect(DuplicatedError.name).toBe('DuplicatedError');
  });

  it('deve retornar 401 para UnauthorizedError', () => {
    expect(new UnauthorizedError()).toHaveProperty('code', 401);
    expect(UnauthorizedError.name).toBe('UnauthorizedError');
  });

  it('deve retornar 400 para ValidationError', () => {
    expect(new ValidationError()).toHaveProperty('code', 400);
    expect(ValidationError.name).toBe('ValidationError');
  });

  it('deve retornar 500 para ServerError', () => {
    expect(new ServerError()).toHaveProperty('code', 500);
    expect(ServerError.name).toBe('ServerError');
  });
});
