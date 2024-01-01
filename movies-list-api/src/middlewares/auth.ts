import { NextFunction, Request, Response } from 'express';
import { IUser } from '../models/user';
import { authenticate, readBearerToken } from '../services/authService';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: IUser | null;
      token?: string;
    }
  }
}

/**
 * Resolves the bearer token on the request to the user that currently holds
 * it. All of the actual checking lives in `authService`; this only adapts it
 * to Express.
 */
const authMiddleware = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
  const token = readBearerToken(req.header('Authorization'));

  try {
    req.user = await authenticate(token);
    req.token = token;
    next();
  } catch (error) {
    next(error);
  }
};

/** Like `authMiddleware`, but a missing or bad token is not fatal. */
export const optionalAuth = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  const token = readBearerToken(req.header('Authorization'));

  try {
    req.user = token ? await authenticate(token) : null;
    req.token = token;
  } catch (error) {
    req.user = null;
  }

  next();
};

export default authMiddleware;
