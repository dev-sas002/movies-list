import {
  getAnthropicModel,
  getCorsOrigins,
  getJwtSecret,
  getListCacheTtlMs,
  getMaxUploadBytes,
  getMongoDbName,
  getMongoUri,
  getPort,
  isAiSearchEnabled,
} from '../config/env';

describe('config/env', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('returns the configured JWT secret', () => {
    process.env.JWT_SECRET = 'a-secret';
    expect(getJwtSecret()).toBe('a-secret');
  });

  it('throws rather than falling back to a default when JWT_SECRET is missing', () => {
    delete process.env.JWT_SECRET;
    expect(() => getJwtSecret()).toThrow(/JWT_SECRET/);
  });

  it('refuses an empty JWT_SECRET too', () => {
    process.env.JWT_SECRET = '';
    expect(() => getJwtSecret()).toThrow(/JWT_SECRET/);
  });

  it('throws a helpful error when MONGODB_URI is missing', () => {
    delete process.env.MONGODB_URI;
    expect(() => getMongoUri()).toThrow(/MONGODB_URI/);
  });

  it('reads the mongo uri lazily so dotenv can run first', () => {
    delete process.env.MONGODB_URI;
    expect(() => getMongoUri()).toThrow();

    process.env.MONGODB_URI = 'mongodb://example:27017';
    expect(getMongoUri()).toBe('mongodb://example:27017');
  });

  it('defaults the database name and lets it be overridden', () => {
    delete process.env.MONGODB_DB;
    expect(getMongoDbName()).toBe('movie-list');

    process.env.MONGODB_DB = 'other';
    expect(getMongoDbName()).toBe('other');
  });

  it('falls back to port 3001 when PORT is unset or invalid', () => {
    delete process.env.PORT;
    expect(getPort()).toBe(3001);

    process.env.PORT = 'not-a-port';
    expect(getPort()).toBe(3001);

    process.env.PORT = '0';
    expect(getPort()).toBe(3001);
  });

  it('uses PORT when it is a valid number', () => {
    process.env.PORT = '4000';
    expect(getPort()).toBe(4000);
  });

  it('opens CORS by default and pins an explicit list when given one', () => {
    delete process.env.CORS_ORIGINS;
    expect(getCorsOrigins()).toBe('*');

    process.env.CORS_ORIGINS = 'http://localhost:8290, https://example.com';
    expect(getCorsOrigins()).toEqual(['http://localhost:8290', 'https://example.com']);
  });

  it('defaults the upload ceiling and the cache ttl', () => {
    delete process.env.MAX_UPLOAD_BYTES;
    delete process.env.LIST_CACHE_TTL_MS;

    expect(getMaxUploadBytes()).toBe(5 * 1024 * 1024);
    expect(getListCacheTtlMs()).toBe(30_000);
  });

  it('treats a missing Anthropic key as "AI search disabled"', () => {
    delete process.env.ANTHROPIC_API_KEY;
    expect(isAiSearchEnabled()).toBe(false);

    process.env.ANTHROPIC_API_KEY = '   ';
    expect(isAiSearchEnabled()).toBe(false);

    process.env.ANTHROPIC_API_KEY = 'sk-ant-xxx';
    expect(isAiSearchEnabled()).toBe(true);
  });

  it('defaults the model and allows an override', () => {
    delete process.env.ANTHROPIC_MODEL;
    expect(getAnthropicModel()).toBe('claude-opus-5');

    process.env.ANTHROPIC_MODEL = 'claude-haiku-4-5';
    expect(getAnthropicModel()).toBe('claude-haiku-4-5');
  });
});
