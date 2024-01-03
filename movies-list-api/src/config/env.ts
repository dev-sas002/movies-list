/**
 * Centralised, lazily-evaluated access to environment configuration.
 *
 * The getters are functions (rather than module-level constants) so that they
 * are read *after* `dotenv.config()` has run, regardless of module import
 * order. Required values throw rather than falling back to a default - a
 * missing secret must fail loudly, never silently weaken authentication.
 */

const requireEnv = (name: string): string => {
  const value = process.env[name];

  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}. ` +
        'Copy .env_sample to .env and fill it in.'
    );
  }

  return value;
};

const readInt = (name: string, fallback: number): number => {
  const parsed = Number(process.env[name]);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

/** Secret used to sign and verify JWTs. Never defaulted. */
export const getJwtSecret = (): string => requireEnv('JWT_SECRET');

/** MongoDB connection string (without the database name). */
export const getMongoUri = (): string => requireEnv('MONGODB_URI');

/** Database name appended to `MONGODB_URI`. */
export const getMongoDbName = (): string => process.env.MONGODB_DB || 'movie-list';

/** Port the HTTP server listens on. Defaults to 3001. */
export const getPort = (): number => {
  const port = Number(process.env.PORT);
  return Number.isInteger(port) && port > 0 ? port : 3001;
};

/**
 * Origins allowed to call the API. `*` (the default) keeps local development
 * frictionless; deployments should pin an explicit comma-separated list.
 */
export const getCorsOrigins = (): string | string[] => {
  const raw = process.env.CORS_ORIGINS?.trim();

  if (!raw || raw === '*') {
    return '*';
  }

  return raw
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
};

/** Largest poster upload accepted, in bytes. Defaults to 5 MB. */
export const getMaxUploadBytes = (): number => readInt('MAX_UPLOAD_BYTES', 5 * 1024 * 1024);

/** How long a movie-list page stays in the read-through cache. */
export const getListCacheTtlMs = (): number => readInt('LIST_CACHE_TTL_MS', 30_000);

/** API key for AI-assisted search. Absent means "fall back to the rule-based planner". */
export const getAnthropicApiKey = (): string | undefined =>
  process.env.ANTHROPIC_API_KEY?.trim() || undefined;

/** Model used for AI-assisted search. */
export const getAnthropicModel = (): string => process.env.ANTHROPIC_MODEL || 'claude-opus-5';

/** True when AI-assisted search can be used at all. */
export const isAiSearchEnabled = (): boolean => getAnthropicApiKey() !== undefined;
