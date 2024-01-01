import { Request, Response, NextFunction } from 'express';
import authMiddleware, { optionalAuth } from '../middlewares/auth';
import { HttpError } from '../errors/httpError';
import * as authService from '../services/authService';

jest.mock('../services/authService', () => {
  const actual = jest.requireActual('../services/authService');
  return { ...actual, authenticate: jest.fn() };
});

const mockedAuthenticate = authService.authenticate as jest.MockedFunction<
  typeof authService.authenticate
>;

const buildReq = (authorization?: string) =>
  ({
    header: (name: string) => (name.toLowerCase() === 'authorization' ? authorization : undefined),
  }) as unknown as Request;

const res = {} as Response;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('authMiddleware', () => {
  it('passes the bearer token to the auth service and attaches the user', async () => {
    const user = { _id: 'user-1' };
    mockedAuthenticate.mockResolvedValue(user as never);

    const req = buildReq('Bearer tok-123');
    const next = jest.fn() as NextFunction;

    await authMiddleware(req, res, next);

    expect(mockedAuthenticate).toHaveBeenCalledWith('tok-123');
    expect(req.user).toBe(user);
    expect(req.token).toBe('tok-123');
    expect(next).toHaveBeenCalledWith();
  });

  it('forwards a missing header to the error handler rather than answering itself', async () => {
    mockedAuthenticate.mockRejectedValue(
      new HttpError(401, 'UNAUTHORIZED', 'Unauthorized - Missing token')
    );

    const next = jest.fn() as NextFunction;
    await authMiddleware(buildReq(undefined), res, next);

    expect(mockedAuthenticate).toHaveBeenCalledWith(undefined);
    expect((next as jest.Mock).mock.calls[0][0]).toBeInstanceOf(HttpError);
  });

  it('ignores an Authorization header that is not a bearer token', async () => {
    mockedAuthenticate.mockRejectedValue(new HttpError(401, 'UNAUTHORIZED', 'nope'));

    await authMiddleware(buildReq('Basic abc'), res, jest.fn() as NextFunction);

    expect(mockedAuthenticate).toHaveBeenCalledWith(undefined);
  });
});

describe('optionalAuth', () => {
  it('resolves the user when the token is good', async () => {
    const user = { _id: 'user-1' };
    mockedAuthenticate.mockResolvedValue(user as never);

    const req = buildReq('Bearer tok-123');
    const next = jest.fn() as NextFunction;

    await optionalAuth(req, res, next);

    expect(req.user).toBe(user);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('continues anonymously when the token is bad instead of failing the request', async () => {
    mockedAuthenticate.mockRejectedValue(new HttpError(401, 'UNAUTHORIZED', 'nope'));

    const req = buildReq('Bearer stale');
    const next = jest.fn() as NextFunction;

    await optionalAuth(req, res, next);

    expect(req.user).toBeNull();
    expect(next).toHaveBeenCalledWith();
  });

  it('continues anonymously when there is no token at all', async () => {
    const req = buildReq(undefined);
    const next = jest.fn() as NextFunction;

    await optionalAuth(req, res, next);

    expect(mockedAuthenticate).not.toHaveBeenCalled();
    expect(req.user).toBeNull();
    expect(next).toHaveBeenCalledTimes(1);
  });
});
