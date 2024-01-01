import {
  ApiRequestError,
  createMovie,
  deleteMovie,
  getMovie,
  getMovies,
  login,
  logout,
  posterSrc,
  updateMovie,
} from "./api";
import { Movie, MovieListResponse } from "contracts/api";

const BASE_URL = process.env.REACT_APP_SERVER_URL || "http://localhost:3001";

/** Minimal stand-in for the parts of `Response` the service layer touches. */
const jsonResponse = (body: unknown, init: { ok?: boolean; status?: number } = {}) =>
  ({
    ok: init.ok ?? true,
    status: init.status ?? 200,
    statusText: "",
    json: jest.fn().mockResolvedValue(body),
  } as unknown as Response);

const movie = (overrides: Partial<Movie> = {}): Movie => ({
  id: "m1",
  title: "Arrival",
  publishYear: 2016,
  synopsis: "Linguist meets heptapods.",
  tags: ["sci-fi"],
  posterUrl: "/movies/m1/poster?v=abc&sig=def",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  ...overrides,
});

const listResponse = (movies: Movie[]): MovieListResponse => ({
  movies,
  pagination: {
    page: 1,
    pageSize: 8,
    total: movies.length,
    totalPages: 1,
    hasMore: false,
  },
  interpretation: null,
});

const fetchMock = jest.fn();

beforeEach(() => {
  fetchMock.mockReset();
  (global as any).fetch = fetchMock;
  jest.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("login", () => {
  it("posts the credentials as JSON and returns the token", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ token: "tok-123", user: { id: "u1", email: "a@b.c" } })
    );

    const token = await login({ email: "a@b.c", password: "password123" });

    expect(token).toBe("tok-123");
    expect(fetchMock).toHaveBeenCalledWith(`${BASE_URL}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "a@b.c", password: "password123" }),
    });
  });

  it("surfaces the server's message instead of a canned one", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(
        { message: "Email and password are required", code: "VALIDATION_FAILED" },
        { ok: false, status: 400 }
      )
    );

    await expect(login({ email: "", password: "" })).rejects.toThrow(
      "Email and password are required"
    );
  });

  it("carries the machine-readable error code alongside the message", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ message: "Invalid credentials", code: "UNAUTHORIZED" }, {
        ok: false,
        status: 401,
      })
    );

    await expect(login({ email: "a@b.c", password: "x" })).rejects.toMatchObject({
      code: "UNAUTHORIZED",
      status: 401,
    });
  });

  it("propagates network failures rather than reporting bad credentials", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));

    const error = await login({ email: "a@b.c", password: "x" }).catch((e) => e);

    expect(error).toBeInstanceOf(ApiRequestError);
    // A transport failure must not be dressed up as "invalid credentials".
    expect(error.code).toBe("NETWORK_ERROR");
    expect(error.message).toBe("Failed to fetch");
  });

  it("fails loudly when the server answers 200 without a token", async () => {
    fetchMock.mockResolvedValue(jsonResponse({}));

    await expect(login({ email: "a@b.c", password: "x" })).rejects.toThrow(
      /did not return an authentication token/
    );
  });
});

describe("logout", () => {
  it("sends the bearer token", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ message: "Logout successful" }));

    await expect(logout("tok-123")).resolves.toBeUndefined();

    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe(`${BASE_URL}/logout`);
    expect(options.method).toBe("POST");
    expect(options.headers.Authorization).toBe("Bearer tok-123");
  });

  it("throws when the server refuses", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ message: "Unauthorized", code: "UNAUTHORIZED" }, { ok: false, status: 401 })
    );

    await expect(logout("stale")).rejects.toThrow("Unauthorized");
  });

  it("omits the Authorization header when there is no token", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ message: "Logout successful" }));

    await logout(null);

    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBeUndefined();
  });
});

describe("getMovies", () => {
  it("passes pagination, search and sort through the query string", async () => {
    fetchMock.mockResolvedValue(jsonResponse(listResponse([movie()])));

    const result = await getMovies(
      { page: 2, pageSize: 5, q: "90s sci-fi", sort: "year-asc" },
      "tok-123"
    );

    expect(result.movies).toHaveLength(1);
    expect(result.pagination.page).toBe(1);

    const url = new URL(fetchMock.mock.calls[0][0]);
    expect(url.pathname).toBe("/movies");
    expect(url.searchParams.get("page")).toBe("2");
    expect(url.searchParams.get("pageSize")).toBe("5");
    expect(url.searchParams.get("q")).toBe("90s sci-fi");
    expect(url.searchParams.get("sort")).toBe("year-asc");
  });

  it("leaves absent parameters out of the query string entirely", async () => {
    fetchMock.mockResolvedValue(jsonResponse(listResponse([])));

    await getMovies({ page: 1 }, "tok-123");

    const url = new URL(fetchMock.mock.calls[0][0]);
    expect(url.searchParams.get("q")).toBeNull();
    expect(url.searchParams.get("sort")).toBeNull();
  });

  it("throws on a non-ok response", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ message: "Unauthorized", code: "UNAUTHORIZED" }, { ok: false, status: 401 })
    );

    await expect(getMovies({ page: 1 }, null)).rejects.toThrow("Unauthorized");
  });
});

describe("getMovie", () => {
  it("requests a single movie and unwraps it", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ movie: movie() }));

    await expect(getMovie("m1", "tok-123")).resolves.toEqual(movie());
    expect(fetchMock.mock.calls[0][0]).toBe(`${BASE_URL}/movies/m1`);
  });

  it("encodes the id rather than splicing it into the path raw", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ movie: movie() }));

    await getMovie("a/../b", "tok-123");

    expect(fetchMock.mock.calls[0][0]).toBe(`${BASE_URL}/movies/a%2F..%2Fb`);
  });

  it("reports the server message when the movie is missing", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(
        { message: "Movie not found or unauthorized to access", code: "NOT_FOUND" },
        { ok: false, status: 404 }
      )
    );

    await expect(getMovie("m1", "tok-123")).rejects.toThrow(/Movie not found/);
  });
});

describe("createMovie", () => {
  it("POSTs multipart form data without forcing a Content-Type", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ message: "Movie created successfully", movie: movie() }, { status: 201 })
    );

    const formData = new FormData();
    formData.append("title", "Arrival");

    await expect(createMovie(formData, "tok-123")).resolves.toEqual(movie());

    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe(`${BASE_URL}/movies`);
    expect(options.method).toBe("POST");
    expect(options.body).toBe(formData);
    // The browser must set the multipart boundary itself.
    expect(options.headers["Content-Type"]).toBeUndefined();
  });

  it("surfaces a validation message from the API", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(
        {
          message: "Publishing year must be a year between 1878 and 2999",
          code: "VALIDATION_FAILED",
        },
        { ok: false, status: 400 }
      )
    );

    await expect(createMovie(new FormData(), "tok-123")).rejects.toThrow(
      /between 1878 and 2999/
    );
  });
});

describe("updateMovie", () => {
  it("PUTs to /movies/:id - not the collection endpoint", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ message: "Movie updated successfully", movie: movie() })
    );

    const formData = new FormData();
    formData.append("title", "Arrival");

    await expect(updateMovie("abc123", formData, "tok-123")).resolves.toEqual(movie());

    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe(`${BASE_URL}/movies/abc123`);
    expect(url).not.toBe(`${BASE_URL}/movies`);
    expect(options.method).toBe("PUT");
    expect(options.headers.Authorization).toBe("Bearer tok-123");
  });

  it("wraps a transport failure as a network error", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));

    const error = await updateMovie("abc123", new FormData(), "tok-123").catch((e) => e);

    expect(error).toBeInstanceOf(ApiRequestError);
    expect(error.code).toBe("NETWORK_ERROR");
  });
});

describe("deleteMovie", () => {
  it("DELETEs the movie by id", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ message: "Movie deleted successfully" }));

    await expect(deleteMovie("m1", "tok-123")).resolves.toBeUndefined();

    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe(`${BASE_URL}/movies/m1`);
    expect(options.method).toBe("DELETE");
  });
});

describe("posterSrc", () => {
  it("makes the signed poster path absolute", () => {
    expect(posterSrc({ posterUrl: "/movies/m1/poster?v=abc&sig=def" })).toBe(
      `${BASE_URL}/movies/m1/poster?v=abc&sig=def`
    );
  });

  it("returns null when the movie has no poster", () => {
    expect(posterSrc({ posterUrl: null })).toBeNull();
  });
});
