import { NextFunction, Request, RequestHandler, Response } from 'express';

/**
 * Express 4 does not catch rejections from async handlers, so every one of
 * them would otherwise need its own try/catch. Wrapping here keeps the route
 * bodies free of error plumbing and routes all failures to one handler.
 */
export const asyncRoute =
  (
    handler: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
  ): RequestHandler =>
  (req, res, next) => {
    handler(req, res, next).catch(next);
  };
