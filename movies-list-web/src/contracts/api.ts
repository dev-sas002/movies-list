/**
 * The HTTP contract shared by `movies-list-api` and `movies-list-web`.
 *
 * SOURCE OF TRUTH: shared/contracts/api.ts
 * Copies live at movies-list-api/src/contracts/api.ts and
 * movies-list-web/src/contracts/api.ts so that each package can compile on its
 * own (Create React App refuses imports from outside `src/`). The copies are
 * produced by `npm run contract:sync` from the repository root, and a test in
 * each package fails if a copy drifts from this file.
 */

/** Machine-readable error identifiers. Every error response carries one. */
export const ERROR_CODES = {
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  UNAUTHORIZED: 'UNAUTHORIZED',
  NOT_FOUND: 'NOT_FOUND',
  PAYLOAD_TOO_LARGE: 'PAYLOAD_TOO_LARGE',
  UNSUPPORTED_MEDIA_TYPE: 'UNSUPPORTED_MEDIA_TYPE',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

/** The single error shape returned by every endpoint. */
export interface ApiError {
  /** Human-readable, safe to show to a user. */
  message: string;
  /** Stable identifier for programmatic handling. */
  code: ErrorCode;
}

/** How a movie list may be ordered. */
export const MOVIE_SORTS = ['newest', 'oldest', 'title', 'year-desc', 'year-asc'] as const;

export type MovieSort = (typeof MOVIE_SORTS)[number];

/**
 * A movie as returned by the API. The poster is never inlined in JSON - it is
 * fetched separately from `posterUrl`, which is a signed, cacheable URL.
 */
export interface Movie {
  id: string;
  title: string;
  publishYear: number;
  synopsis: string;
  tags: string[];
  /** Signed, immutable poster URL, or null when the movie has no poster. */
  posterUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

/** Where the structured reading of a natural-language query came from. */
export type InterpretationSource = 'rules' | 'ai';

/**
 * The structured query a free-text search was resolved to. Surfaced to the UI
 * so a user can see - and correct - how their words were understood.
 */
export interface SearchInterpretation {
  source: InterpretationSource;
  /** Free-text remainder matched against title, synopsis and tags. */
  text: string | null;
  yearFrom: number | null;
  yearTo: number | null;
  tags: string[];
  sort: MovieSort;
  /** One-line description of the above, ready to render. */
  summary: string;
}

export interface MovieListResponse {
  movies: Movie[];
  pagination: Pagination;
  /** Present only when the request carried a `q` parameter. */
  interpretation: SearchInterpretation | null;
}

export interface MovieResponse {
  movie: Movie;
}

export interface MovieMutationResponse {
  message: string;
  movie: Movie;
}

export interface MessageResponse {
  message: string;
}

export interface LoginResponse {
  token: string;
  user: { id: string; email: string };
}

export interface HealthResponse {
  status: 'ok' | 'degraded';
  uptimeSeconds: number;
  database: 'connected' | 'disconnected';
  aiSearch: 'enabled' | 'disabled';
}

/** Query parameters accepted by `GET /movies`. */
export interface MovieListQuery {
  page?: number;
  pageSize?: number;
  /** Natural-language or plain-text search, e.g. "90s sci-fi, newest first". */
  q?: string;
  sort?: MovieSort;
}
