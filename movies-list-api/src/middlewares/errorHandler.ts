import { NextFunction, Request, Response } from 'express';
import { ERROR_CODES } from '../contracts/api';
import { HttpError } from '../errors/httpError';

/** Anything that is not an `HttpError` is a bug; never leak its details. */
export const errorHandler = (
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  if (error instanceof HttpError) {
    res.status(error.status).json({ message: error.message, code: error.code });
    return;
  }

  // Multer signals an oversized upload with its own error code.
  if (
    typeof error === 'object' &&
    error !== null &&
    (error as { code?: string }).code === 'LIMIT_FILE_SIZE'
  ) {
    res
      .status(413)
      .json({ message: 'Poster image is too large', code: ERROR_CODES.PAYLOAD_TOO_LARGE });
    return;
  }

  console.error(error);
  res.status(500).json({ message: 'Internal Server Error', code: ERROR_CODES.INTERNAL_ERROR });
};

export const notFoundHandler = (_req: Request, res: Response): void => {
  res.status(404).json({ message: 'Not found', code: ERROR_CODES.NOT_FOUND });
};
