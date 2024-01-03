import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { LoginResponse } from '../contracts/api';
import { getJwtSecret } from '../config/env';
import { badRequest, unauthorized } from '../errors/httpError';
import { IUser } from '../models/user';
import * as userRepository from '../repositories/userRepository';

/**
 * Authentication use cases. The routes hold no auth logic of their own, and
 * the JWT secret is only ever read through `getJwtSecret()`, which throws when
 * it is unset - there is deliberately no fallback secret anywhere.
 */

const TOKEN_TTL = '1h';

export const login = async (email: unknown, password: unknown): Promise<LoginResponse> => {
  // Without this guard Mongoose strips the undefined `email` and
  // `findOne({})` happily returns an arbitrary user.
  if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
    throw badRequest('Email and password are required');
  }

  const user = await userRepository.findByEmail(email);

  if (!user) {
    throw unauthorized('Invalid email or password');
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);

  if (!isPasswordValid) {
    throw unauthorized('Invalid email or password');
  }

  const token = jwt.sign({ userId: user._id }, getJwtSecret(), { expiresIn: TOKEN_TTL });

  await userRepository.saveSessionToken(user, token);

  return { token, user: { id: String(user._id), email: user.email } };
};

const verify = (token: string): { userId: string } => {
  try {
    return jwt.verify(token, getJwtSecret()) as { userId: string };
  } catch (error) {
    // A malformed/expired token is an authentication failure, not a server error.
    throw unauthorized('Unauthorized - Invalid token');
  }
};

/** Resolves a bearer token to the user that currently holds it. */
export const authenticate = async (token: string | undefined): Promise<IUser> => {
  if (!token) {
    throw unauthorized('Unauthorized - Missing token');
  }

  const { userId } = verify(token);
  const user = await userRepository.findBySessionToken(userId, token);

  if (!user) {
    throw unauthorized('Unauthorized - Invalid token');
  }

  return user;
};

export const logout = async (token: string | undefined): Promise<void> => {
  if (!token) {
    throw unauthorized();
  }

  const { userId } = verify(token);
  const user = await userRepository.findById(userId);

  // An already-revoked (or superseded) token must not be able to log out
  // whatever session currently owns the account.
  if (!user || user.authToken !== token) {
    throw unauthorized();
  }

  await userRepository.saveSessionToken(user, undefined);
};

/** Extracts the bearer token from an `Authorization` header value. */
export const readBearerToken = (header: string | undefined): string | undefined =>
  header?.startsWith('Bearer ') ? header.slice('Bearer '.length).trim() || undefined : undefined;
