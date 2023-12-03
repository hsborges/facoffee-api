export abstract class HttpError extends Error {
  public readonly code: number;
  constructor(message: string, code: number) {
    super(message);
    this.code = code;
  }
}

export class NotFoundError extends HttpError {
  constructor(message: string = 'Not found') {
    super(message, 404);
  }
}

export class DuplicatedError extends HttpError {
  constructor(message: string = 'Duplicated resource') {
    super(message, 409);
  }
}

export class UnauthorizedError extends HttpError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401);
  }
}

export class ValidationError extends HttpError {
  constructor(message: string = 'Validation error') {
    super(message, 400);
  }
}

export class ServerError extends HttpError {
  constructor(message: string = 'Server error') {
    super(message, 500);
  }
}
