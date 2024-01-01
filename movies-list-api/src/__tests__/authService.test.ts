import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import User from '../models/user';
import { HttpError } from '../errors/httpError';
import { authenticate, login, logout, readBearerToken } from '../services/authService';

const SECRET = process.env.JWT_SECRET as string;

const expectHttpError = async (promise: Promise<unknown>, status: number, message: RegExp) => {
  await expect(promise).rejects.toBeInstanceOf(HttpError);
  await expect(promise).rejects.toMatchObject({ status, message: expect.stringMatching(message) });
};

afterEach(() => {
  jest.restoreAllMocks();
});

describe('readBearerToken', () => {
  it('extracts the token from a bearer header', () => {
    expect(readBearerToken('Bearer abc.def')).toBe('abc.def');
  });

  it('ignores other authorization schemes and empty values', () => {
    expect(readBearerToken(undefined)).toBeUndefined();
    expect(readBearerToken('Basic abc')).toBeUndefined();
    expect(readBearerToken('Bearer ')).toBeUndefined();
  });
});

describe('login', () => {
  it('refuses a request with no credentials before querying the database', async () => {
    const findOne = jest.spyOn(User, 'findOne');

    await expectHttpError(login(undefined, undefined), 400, /required/);
    // Mongoose strips undefined filters, so `findOne({})` would match an
    // arbitrary user - the guard must short-circuit first.
    expect(findOne).not.toHaveBeenCalled();
  });

  it('rejects non-string credentials', async () => {
    await expectHttpError(login({ $ne: null }, 'password123'), 400, /required/);
  });

  it('returns 401 for an unknown email', async () => {
    jest.spyOn(User, 'findOne').mockResolvedValue(null as never);

    await expectHttpError(
      login('nobody@example.com', 'password123'),
      401,
      /Invalid email or password/
    );
  });

  it('returns 401 for a wrong password', async () => {
    jest.spyOn(User, 'findOne').mockResolvedValue({
      _id: 'user-1',
      email: 'test@example.com',
      password: await bcrypt.hash('password123', 4),
      save: jest.fn(),
    } as never);

    await expectHttpError(login('test@example.com', 'wrong'), 401, /Invalid email or password/);
  });

  it('issues a signed token and stores it on the user', async () => {
    const save = jest.fn();
    const user: any = {
      _id: 'user-1',
      email: 'test@example.com',
      password: await bcrypt.hash('password123', 4),
      authToken: null,
      save,
    };
    jest.spyOn(User, 'findOne').mockResolvedValue(user as never);

    const result = await login('test@example.com', 'password123');

    expect(jwt.verify(result.token, SECRET)).toMatchObject({ userId: 'user-1' });
    expect(result.user).toEqual({ id: 'user-1', email: 'test@example.com' });
    expect(user.authToken).toBe(result.token);
    expect(save).toHaveBeenCalledTimes(1);
  });
});

describe('authenticate', () => {
  it('rejects a missing token', async () => {
    await expectHttpError(authenticate(undefined), 401, /Missing token/);
  });

  it('rejects a token signed with another secret', async () => {
    const foreign = jwt.sign({ userId: 'user-1' }, 'some-other-secret');

    await expectHttpError(authenticate(foreign), 401, /Invalid token/);
  });

  it('rejects an expired token', async () => {
    const expired = jwt.sign({ userId: 'user-1' }, SECRET, { expiresIn: '-1s' });

    await expectHttpError(authenticate(expired), 401, /Invalid token/);
  });

  it('rejects a valid token the user no longer holds', async () => {
    const token = jwt.sign({ userId: 'user-1' }, SECRET);
    jest.spyOn(User, 'findOne').mockResolvedValue(null as never);

    await expectHttpError(authenticate(token), 401, /Invalid token/);
    expect(User.findOne).toHaveBeenCalledWith({ _id: 'user-1', authToken: token });
  });

  it('returns the user holding the token', async () => {
    const token = jwt.sign({ userId: 'user-1' }, SECRET);
    const user = { _id: 'user-1' };
    jest.spyOn(User, 'findOne').mockResolvedValue(user as never);

    await expect(authenticate(token)).resolves.toBe(user);
  });
});

describe('logout', () => {
  it('rejects a missing token', async () => {
    await expectHttpError(logout(undefined), 401, /Unauthorized/);
  });

  it('rejects a malformed token without reaching the database', async () => {
    const findById = jest.spyOn(User, 'findById');

    await expectHttpError(logout('not-a-token'), 401, /Unauthorized/);
    expect(findById).not.toHaveBeenCalled();
  });

  it('refuses a superseded token that no longer matches the stored session', async () => {
    const stale = jwt.sign({ userId: 'user-1' }, SECRET);
    const save = jest.fn();
    jest.spyOn(User, 'findById').mockResolvedValue({ authToken: 'a-newer-token', save } as never);

    await expectHttpError(logout(stale), 401, /Unauthorized/);
    expect(save).not.toHaveBeenCalled();
  });

  it('clears the stored token for the current session', async () => {
    const token = jwt.sign({ userId: 'user-1' }, SECRET);
    const save = jest.fn();
    const user: any = { authToken: token, save };
    jest.spyOn(User, 'findById').mockResolvedValue(user as never);

    await logout(token);

    expect(user.authToken).toBeUndefined();
    expect(save).toHaveBeenCalledTimes(1);
  });
});
