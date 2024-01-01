import { createHash } from 'crypto';
import { MOVIE_SORTS, Movie as MovieDto, MovieListResponse, MovieSort } from '../contracts/api';
import { getListCacheTtlMs } from '../config/env';
import { badRequest, notFound, unsupportedMediaType } from '../errors/httpError';
import { IMovie } from '../models/movie';
import * as movieRepository from '../repositories/movieRepository';
import { MovieFilter } from '../repositories/movieRepository';
import { getSearchPlanner } from '../search';
import { SearchPlan, describePlan, emptyFilter } from '../search/types';
import { InMemoryTtlCache } from './cache';
import { buildPosterUrl, posterVersion, verifyPosterSignature } from './posterUrl';

/**
 * Movie use cases. Routes do nothing but translate HTTP to these calls, and
 * this layer never touches Mongoose directly.
 */

export const DEFAULT_PAGE_SIZE = 12;
export const MAX_PAGE_SIZE = 100;
export const ALLOWED_POSTER_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

const EARLIEST_FILM_YEAR = 1878;

/**
 * Read-through cache for list pages. The movie list is by far the most
 * requested endpoint and its contents change rarely, so a short TTL removes
 * almost all of the repeated `find` + `countDocuments` pairs. Writes drop
 * every cached page belonging to the user that made them.
 */
const listCache = new InMemoryTtlCache<MovieListResponse>(getListCacheTtlMs(), 500);

export const clearListCache = (): void => listCache.clear();

export interface PosterUpload {
  buffer: Buffer;
  mimetype: string;
}

export interface MovieInput {
  title?: unknown;
  publicationYear?: unknown;
  synopsis?: unknown;
  tags?: unknown;
}

export interface ListParams {
  userId: string;
  page?: unknown;
  pageSize?: unknown;
  q?: unknown;
  sort?: unknown;
}

const clampPage = (value: unknown): number => Math.max(1, parseInt(String(value), 10) || 1);

const clampPageSize = (value: unknown): number =>
  Math.min(MAX_PAGE_SIZE, Math.max(1, parseInt(String(value), 10) || DEFAULT_PAGE_SIZE));

const isMovieSort = (value: unknown): value is MovieSort =>
  typeof value === 'string' && (MOVIE_SORTS as readonly string[]).includes(value);

export const toDto = (movie: IMovie): MovieDto => {
  const id = String(movie._id);
  const userId = String(movie.userId);

  return {
    id,
    title: movie.title,
    publishYear: movie.publishYear,
    synopsis: movie.synopsis ?? '',
    tags: movie.tags ?? [],
    posterUrl: buildPosterUrl(userId, id, movie.imageHash),
    createdAt: movie.createdAt ? new Date(movie.createdAt).toISOString() : '',
    updatedAt: movie.updatedAt ? new Date(movie.updatedAt).toISOString() : '',
  };
};

const parseTitle = (value: unknown): string => {
  const title = typeof value === 'string' ? value.trim() : '';

  if (!title) {
    throw badRequest('A title is required');
  }

  if (title.length > 200) {
    throw badRequest('Title must be 200 characters or fewer');
  }

  return title;
};

const parseYear = (value: unknown): number => {
  const year = Number(value);

  if (!Number.isInteger(year) || year < EARLIEST_FILM_YEAR || year > 2999) {
    throw badRequest(`Publishing year must be a year between ${EARLIEST_FILM_YEAR} and 2999`);
  }

  return year;
};

const parseSynopsis = (value: unknown): string => {
  const synopsis = typeof value === 'string' ? value.trim() : '';

  if (synopsis.length > 2000) {
    throw badRequest('Synopsis must be 2000 characters or fewer');
  }

  return synopsis;
};

/** Accepts either a comma-separated string or a repeated form field. */
export const parseTags = (value: unknown): string[] => {
  const raw = Array.isArray(value) ? value : String(value ?? '').split(',');

  const tags = raw
    .map((tag) => String(tag).trim().toLowerCase())
    .filter((tag) => tag.length > 0 && tag.length <= 40);

  return [...new Set(tags)].slice(0, 12);
};

const parsePoster = (poster: PosterUpload | undefined): Partial<IMovie> => {
  if (!poster) {
    return {};
  }

  if (!ALLOWED_POSTER_TYPES.includes(poster.mimetype)) {
    throw unsupportedMediaType(`Poster must be one of: ${ALLOWED_POSTER_TYPES.join(', ')}`);
  }

  return {
    image: poster.buffer,
    imageType: poster.mimetype,
    imageHash: createHash('sha256').update(poster.buffer).digest('hex'),
  };
};

const cacheKey = (userId: string, plan: SearchPlan, page: number, pageSize: number): string =>
  `${userId}|${plan.sort}|${JSON.stringify(plan.filter)}|${page}|${pageSize}`;

/** Resolves the requested query into a plan, consulting the planner only for `q`. */
const resolvePlan = async (q: unknown, sort: unknown): Promise<SearchPlan> => {
  const query = typeof q === 'string' ? q.trim() : '';
  const explicitSort = isMovieSort(sort) ? sort : null;

  if (!query) {
    return { filter: emptyFilter(), sort: explicitSort ?? 'newest', source: 'rules' };
  }

  const plan = await getSearchPlanner().plan(query);

  // An explicit sort control in the UI always beats one inferred from prose.
  return explicitSort ? { ...plan, sort: explicitSort } : plan;
};

export const listMovies = async (params: ListParams): Promise<MovieListResponse> => {
  const page = clampPage(params.page);
  const pageSize = clampPageSize(params.pageSize);
  const plan = await resolvePlan(params.q, params.sort);
  const hasQuery = typeof params.q === 'string' && params.q.trim().length > 0;

  const key = cacheKey(params.userId, plan, page, pageSize);
  const cached = listCache.get(key);

  if (cached) {
    return { ...cached, interpretation: hasQuery ? describePlan(plan) : null };
  }

  const { movies, total } = await movieRepository.list({
    userId: params.userId,
    filter: plan.filter as MovieFilter,
    sort: plan.sort,
    skip: (page - 1) * pageSize,
    limit: pageSize,
  });

  const response: MovieListResponse = {
    movies: movies.map(toDto),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
      hasMore: page * pageSize < total,
    },
    interpretation: hasQuery ? describePlan(plan) : null,
  };

  listCache.set(key, response);

  return response;
};

export const getMovie = async (userId: string, movieId: string): Promise<MovieDto> => {
  if (!movieRepository.isValidId(movieId)) {
    throw notFound('Movie not found or unauthorized to access');
  }

  const movie = await movieRepository.findById(userId, movieId);

  if (!movie) {
    throw notFound('Movie not found or unauthorized to access');
  }

  return toDto(movie);
};

export const createMovie = async (
  userId: string,
  input: MovieInput,
  poster: PosterUpload | undefined
): Promise<MovieDto> => {
  if (!poster) {
    throw badRequest('A poster image is required');
  }

  const movie = await movieRepository.create({
    title: parseTitle(input.title),
    publishYear: parseYear(input.publicationYear),
    synopsis: parseSynopsis(input.synopsis),
    tags: parseTags(input.tags),
    userId: userId as never,
    ...parsePoster(poster),
  });

  listCache.invalidatePrefix(`${userId}|`);

  return toDto(movie);
};

export const updateMovie = async (
  userId: string,
  movieId: string,
  input: MovieInput,
  poster: PosterUpload | undefined
): Promise<MovieDto> => {
  const changes: Record<string, unknown> = {
    title: parseTitle(input.title),
    publishYear: parseYear(input.publicationYear),
    synopsis: parseSynopsis(input.synopsis),
    tags: parseTags(input.tags),
    // Only overwrite the poster when a replacement was actually uploaded,
    // otherwise an edit that leaves the image untouched would erase it.
    ...parsePoster(poster),
  };

  if (!movieRepository.isValidId(movieId)) {
    throw notFound('Movie not found or unauthorized to update');
  }

  const updated = await movieRepository.update(userId, movieId, changes);

  if (!updated) {
    throw notFound('Movie not found or unauthorized to update');
  }

  listCache.invalidatePrefix(`${userId}|`);

  return toDto(updated);
};

export const deleteMovie = async (userId: string, movieId: string): Promise<void> => {
  if (!movieRepository.isValidId(movieId)) {
    throw notFound('Movie not found or unauthorized to delete');
  }

  const deleted = await movieRepository.remove(userId, movieId);

  if (!deleted) {
    throw notFound('Movie not found or unauthorized to delete');
  }

  listCache.invalidatePrefix(`${userId}|`);
};

export interface PosterResponse {
  body: Buffer;
  contentType: string;
  etag: string;
}

export interface PosterRequest {
  movieId: string;
  version?: string;
  signature?: string;
  /** Set when the caller authenticated with a bearer token instead. */
  authenticatedUserId?: string;
}

/**
 * Serves poster bytes to either a signed URL or an authenticated owner.
 * Everything else is a 404 - an unauthorised request must not be able to tell
 * a private movie from a missing one.
 */
export const getPoster = async (request: PosterRequest): Promise<PosterResponse> => {
  const missing = notFound('Poster not found');

  if (!movieRepository.isValidId(request.movieId)) {
    throw missing;
  }

  const movie = await movieRepository.findPoster(request.movieId);

  if (!movie?.image || !movie.imageHash) {
    throw missing;
  }

  const ownerId = String(movie.userId);
  const isOwner = request.authenticatedUserId === ownerId;
  const isSigned =
    request.version === posterVersion(movie.imageHash) &&
    verifyPosterSignature(ownerId, request.movieId, movie.imageHash, request.signature);

  if (!isOwner && !isSigned) {
    throw missing;
  }

  return {
    body: Buffer.from(movie.image),
    contentType: movie.imageType || 'application/octet-stream',
    etag: `"${posterVersion(movie.imageHash)}"`,
  };
};
