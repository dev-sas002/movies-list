import { NextFunction, Request, Response } from 'express';
import { MulterError } from 'multer';
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

  // Multer reports upload problems with its own codes. An oversized file is a
  // 413; anything else (a second file, an unexpected field name) is the
  // client's mistake, not a server fault.
  if (error instanceof MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      res
        .status(413)
        .json({ message: 'Poster image is too large', code: ERROR_CODES.PAYLOAD_TOO_LARGE });
    } else {
      res.status(400).json({ message: error.message, code: ERROR_CODES.VALIDATION_FAILED });
    }
    return;
  }

  // body-parser tags its failures (malformed JSON, oversized body) with a 4xx
  // `status` and an `expose` flag; without this they surfaced as a 500.
  const parserError = error as { status?: unknown; expose?: unknown };
  if (
    typeof parserError === 'object' &&
    parserError !== null &&
    parserError.expose === true &&
    typeof parserError.status === 'number' &&
    parserError.status >= 400 &&
    parserError.status < 500
  ) {
    const tooLarge = parserError.status === 413;
    res.status(parserError.status).json({
      message: tooLarge ? 'Request body is too large' : 'Request body could not be parsed',
      code: tooLarge ? ERROR_CODES.PAYLOAD_TOO_LARGE : ERROR_CODES.VALIDATION_FAILED,
    });
    return;
  }

  console.error(error);
  res.status(500).json({ message: 'Internal Server Error', code: ERROR_CODES.INTERNAL_ERROR });
};

export const notFoundHandler = (_req: Request, res: Response): void => {
  res.status(404).json({ message: 'Not found', code: ERROR_CODES.NOT_FOUND });
};
