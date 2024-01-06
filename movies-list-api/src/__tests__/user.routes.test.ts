import request from 'supertest';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import app from '../app';
import User from '../models/user';

const SECRET = process.env.JWT_SECRET as string;

describe('user routes', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('POST /login', () => {
    it('rejects a body without credentials instead of matching an arbitrary user', async () => {
      const findOne = jest.spyOn(User, 'findOne');

      const response = await request(app).post('/login').send({});

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        message: 'Email and password are required',
        code: 'VALIDATION_FAILED',
      });
      expect(findOne).not.toHaveBeenCalled();
    });

    it('returns 401 for an unknown email', async () => {
      jest.spyOn(User, 'findOne').mockResolvedValue(null as never);

      const response = await request(app)
        .post('/login')
        .send({ email: 'nobody@example.com', password: 'password123' });

      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        message: 'Invalid email or password',
        code: 'UNAUTHORIZED',
      });
    });

    it('issues a signed token and persists it on the user', async () => {
      const save = jest.fn();
      const user: any = {
        _id: 'user-1',
        email: 'test@example.com',
        password: await bcrypt.hash('password123', 4),
        authToken: null,
        save,
      };
      jest.spyOn(User, 'findOne').mockResolvedValue(user as never);

      const response = await request(app)
        .post('/login')
        .send({ email: 'test@example.com', password: 'password123' });

      expect(response.status).toBe(200);
      expect(response.body.user).toEqual({ id: 'user-1', email: 'test@example.com' });

      const decoded = jwt.verify(response.body.token, SECRET) as { userId: string };
      expect(decoded.userId).toBe('user-1');
      expect(user.authToken).toBe(response.body.token);
      expect(save).toHaveBeenCalledTimes(1);
    });

    it('never leaks the password hash in the response', async () => {
      const hashed = await bcrypt.hash('password123', 4);
      jest.spyOn(User, 'findOne').mockResolvedValue({
        _id: 'user-1',
        email: 'test@example.com',
        password: hashed,
        save: jest.fn(),
      } as never);

      const response = await request(app)
        .post('/login')
        .send({ email: 'test@example.com', password: 'password123' });

      expect(JSON.stringify(response.body)).not.toContain(hashed);
    });

    it('returns 500 with no internal detail when the database blows up', async () => {
      jest
        .spyOn(User, 'findOne')
        .mockRejectedValue(new Error('db down at mongo://secret') as never);

      const response = await request(app)
        .post('/login')
        .send({ email: 'test@example.com', password: 'password123' });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        message: 'Internal Server Error',
        code: 'INTERNAL_ERROR',
      });
      expect(JSON.stringify(response.body)).not.toContain('mongo://secret');
    });
  });

  describe('POST /logout', () => {
    it('returns 401 without an Authorization header', async () => {
      const response = await request(app).post('/logout');

      expect(response.status).toBe(401);
      expect(response.body.code).toBe('UNAUTHORIZED');
    });

    it('returns 401 (not 500) for a malformed token', async () => {
      const response = await request(app)
        .post('/logout')
        .set('Authorization', 'Bearer not-a-real-token');

      expect(response.status).toBe(401);
    });

    it('refuses a superseded token that no longer matches the stored session', async () => {
      const staleToken = jwt.sign({ userId: 'user-1' }, SECRET);
      const save = jest.fn();
      jest.spyOn(User, 'findById').mockResolvedValue({
        _id: 'user-1',
        authToken: 'a-newer-token',
        save,
      } as never);

      const response = await request(app)
        .post('/logout')
        .set('Authorization', `Bearer ${staleToken}`);

      expect(response.status).toBe(401);
      expect(save).not.toHaveBeenCalled();
    });

    it('clears the stored token for the current session', async () => {
      const token = jwt.sign({ userId: 'user-1' }, SECRET);
      const save = jest.fn();
      const user: any = { _id: 'user-1', authToken: token, save };
      jest.spyOn(User, 'findById').mockResolvedValue(user as never);

      const response = await request(app).post('/logout').set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ message: 'Logout successful' });
      expect(user.authToken).toBeUndefined();
      expect(save).toHaveBeenCalledTimes(1);
    });
  });
});

describe('unknown routes', () => {
  it('answers with the documented error shape', async () => {
    const response = await request(app).get('/nope');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ message: 'Not found', code: 'NOT_FOUND' });
  });
});
