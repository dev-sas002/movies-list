import {
  ApiError,
  ErrorCode,
  LoginResponse,
  Movie,
  MovieListQuery,
  MovieListResponse,
  MovieMutationResponse,
  MovieResponse,
} from "contracts/api";

/**
 * The only module that talks HTTP. Every response is typed against the shared
 * contract in `src/contracts/api.ts`, which is generated from
 * `shared/contracts/api.ts` and kept in step by a test in each package.
 */

export const BASE_URL = process.env.REACT_APP_SERVER_URL || "http://localhost:3001";

/** Carries the API's machine-readable error code alongside its message. */
export class ApiRequestError extends Error {
  readonly status: number;

  readonly code: ErrorCode | "NETWORK_ERROR";

  constructor(message: string, status: number, code: ErrorCode | "NETWORK_ERROR") {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    this.code = code;
  }
}

const authHeaders = (token: string | null): Record<string, string> =>
  token ? { Authorization: `Bearer ${token}` } : {};

const toError = async (response: Response): Promise<ApiRequestError> => {
  try {
    const body = (await response.json()) as Partial<ApiError>;

    if (body?.message) {
      return new ApiRequestError(
        body.message,
        response.status,
        (body.code as ErrorCode) ?? "INTERNAL_ERROR"
      );
    }
  } catch {
    // body was not JSON - fall through to the status line
  }

  return new ApiRequestError(
    response.statusText || `Request failed with status ${response.status}`,
    response.status,
    "INTERNAL_ERROR"
  );
};

/** Performs the request, turning any failure into an `ApiRequestError`. */
const request = async <T>(path: string, init: RequestInit): Promise<T> => {
  let response: Response;

  try {
    response = await fetch(`${BASE_URL}${path}`, init);
  } catch (error) {
    // A transport failure must not be reported as "invalid credentials".
    throw new ApiRequestError(
      error instanceof Error ? error.message : "Could not reach the server",
      0,
      "NETWORK_ERROR"
    );
  }

  if (!response.ok) {
    throw await toError(response);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
};

export const login = async (credentials: {
  email: string;
  password: string;
}): Promise<string> => {
  const data = await request<LoginResponse>("/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(credentials),
  });

  if (!data?.token) {
    throw new ApiRequestError(
      "The server did not return an authentication token",
      200,
      "INTERNAL_ERROR"
    );
  }

  return data.token;
};

export const logout = async (token: string | null): Promise<void> => {
  await request<{ message: string }>("/logout", {
    method: "POST",
    headers: { ...authHeaders(token), "Content-Type": "application/json" },
  });
};

export const getMovies = (
  query: MovieListQuery,
  token: string | null
): Promise<MovieListResponse> => {
  const params = new URLSearchParams();

  if (query.page) params.set("page", String(query.page));
  if (query.pageSize) params.set("pageSize", String(query.pageSize));
  if (query.q) params.set("q", query.q);
  if (query.sort) params.set("sort", query.sort);

  return request<MovieListResponse>(`/movies?${params.toString()}`, {
    method: "GET",
    headers: { ...authHeaders(token), "Content-Type": "application/json" },
  });
};

export const getMovie = async (movieId: string, token: string | null): Promise<Movie> => {
  const data = await request<MovieResponse>(`/movies/${encodeURIComponent(movieId)}`, {
    method: "GET",
    headers: { ...authHeaders(token), "Content-Type": "application/json" },
  });

  return data.movie;
};

export const createMovie = async (
  formData: FormData,
  token: string | null
): Promise<Movie> => {
  // No Content-Type header: the browser must set the multipart boundary.
  const data = await request<MovieMutationResponse>("/movies", {
    method: "POST",
    headers: authHeaders(token),
    body: formData,
  });

  return data.movie;
};

export const updateMovie = async (
  movieId: string,
  formData: FormData,
  token: string | null
): Promise<Movie> => {
  const data = await request<MovieMutationResponse>(`/movies/${encodeURIComponent(movieId)}`, {
    method: "PUT",
    headers: authHeaders(token),
    body: formData,
  });

  return data.movie;
};

export const deleteMovie = async (movieId: string, token: string | null): Promise<void> => {
  await request<{ message: string }>(`/movies/${encodeURIComponent(movieId)}`, {
    method: "DELETE",
    headers: { ...authHeaders(token), "Content-Type": "application/json" },
  });
};

/**
 * Absolute URL for a poster. The path returned by the API is already signed,
 * so it can be dropped straight into an `<img src>` - which cannot send an
 * Authorization header.
 */
export const posterSrc = (movie: Pick<Movie, "posterUrl">): string | null =>
  movie.posterUrl ? `${BASE_URL}${movie.posterUrl}` : null;
