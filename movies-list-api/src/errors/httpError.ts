import { ERROR_CODES, ErrorCode } from '../contracts/api';

/**
 * An error a route is happy to show a client. Anything else that reaches the
 * error handler is treated as a bug and reported as a generic 500, so internal
 * details never leak into a response body.
 */
export class HttpError extends Error {
  readonly status: number;

  readonly code: ErrorCode;

  constructor(status: number, code: ErrorCode, message: string) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.code = code;
  }
}

export const badRequest = (message: string): HttpError =>
  new HttpError(400, ERROR_CODES.VALIDATION_FAILED, message);

export const unauthorized = (message = 'Unauthorized'): HttpError =>
  new HttpError(401, ERROR_CODES.UNAUTHORIZED, message);

export const notFound = (message: string): HttpError =>
  new HttpError(404, ERROR_CODES.NOT_FOUND, message);

export const payloadTooLarge = (message: string): HttpError =>
  new HttpError(413, ERROR_CODES.PAYLOAD_TOO_LARGE, message);

export const unsupportedMediaType = (message: string): HttpError =>
  new HttpError(415, ERROR_CODES.UNSUPPORTED_MEDIA_TYPE, message);
