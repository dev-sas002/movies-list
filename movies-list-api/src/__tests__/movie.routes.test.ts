import request from 'supertest';

// The middleware is covered in auth.middleware.test.ts and the use cases in
// movieService.test.ts; these tests only assert the HTTP wiring.
const USER_ID = '65900000000000000000000a';

jest.mock('../middlewares/auth', () => ({
  __esModule: true,
  default: (req: any, _res: any, next: any) => {
    req.user = { _id: '65900000000000000000000a' };
    next();
  },
  optionalAuth: (req: any, _res: any, next: any) => {
    req.user = null;
    next();
  },
}));

jest.mock('../services/movieService', () => ({
  __esModule: true,
  listMovies: jest.fn(),
  getMovie: jest.fn(),
  createMovie: jest.fn(),
  updateMovie: jest.fn(),
  deleteMovie: jest.fn(),
  getPoster: jest.fn(),
}));

import app from '../app';
import { HttpError } from '../errors/httpError';
import * as movieService from '../services/movieService';

const mocked = movieService as jest.Mocked<typeof movieService>;

const movie = {
  id: 'm1',
  title: 'Arrival',
  publishYear: 2016,
  synopsis: '',
  tags: [],
  posterUrl: '/movies/m1/poster?v=abc&sig=def',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

const listResult = {
  movies: [movie],
  pagination: { page: 1, pageSize: 12, total: 1, totalPages: 1, hasMore: false },
  interpretation: null,
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('GET /movies', () => {
  it('passes the query string straight through to the service', async () => {
    mocked.listMovies.mockResolvedValue(listResult);

    const response = await request(app).get('/movies?page=2&pageSize=5&q=90s%20sci-fi&sort=title');

    expect(response.status).toBe(200);
    expect(response.body).toEqual(listResult);
    expect(mocked.listMovies).toHaveBeenCalledWith({
      userId: USER_ID,
      page: '2',
      pageSize: '5',
      q: '90s sci-fi',
      sort: 'title',
    });
  });

  it('turns a service failure into the documented 500 shape', async () => {
    mocked.listMovies.mockRejectedValue(new Error('boom'));

    const response = await request(app).get('/movies');

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ message: 'Internal Server Error', code: 'INTERNAL_ERROR' });
  });
});

describe('POST /movies', () => {
  it('forwards the multipart fields and the uploaded poster', async () => {
    mocked.createMovie.mockResolvedValue(movie);

    const response = await request(app)
      .post('/movies')
      .field('title', 'Arrival')
      .field('publicationYear', '2016')
      .field('synopsis', 'A linguist talks to visitors.')
      .field('tags', 'sci-fi, drama')
      .attach('image', Buffer.from('poster-bytes'), {
        filename: 'poster.jpg',
        contentType: 'image/jpeg',
      });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({ message: 'Movie created successfully', movie });

    const [userId, input, poster] = mocked.createMovie.mock.calls[0];
    expect(userId).toBe(USER_ID);
    expect(input).toEqual({
      title: 'Arrival',
      publicationYear: '2016',
      synopsis: 'A linguist talks to visitors.',
      tags: 'sci-fi, drama',
    });
    expect(poster?.mimetype).toBe('image/jpeg');
    expect(poster?.buffer.toString()).toBe('poster-bytes');
  });

  it('reports a validation failure from the service with its own status', async () => {
    mocked.createMovie.mockRejectedValue(
      new HttpError(400, 'VALIDATION_FAILED', 'A title is required')
    );

    const response = await request(app).post('/movies').field('publicationYear', '2016');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ message: 'A title is required', code: 'VALIDATION_FAILED' });
  });

  it('rejects an oversized upload with 413 rather than 500', async () => {
    const oversized = Buffer.alloc(Number(process.env.MAX_UPLOAD_BYTES) + 1024);

    const response = await request(app)
      .post('/movies')
      .field('title', 'Arrival')
      .field('publicationYear', '2016')
      .attach('image', oversized, { filename: 'big.jpg', contentType: 'image/jpeg' });

    expect(response.status).toBe(413);
    expect(response.body.code).toBe('PAYLOAD_TOO_LARGE');
    expect(mocked.createMovie).not.toHaveBeenCalled();
  });
});

describe('GET /movies/:id', () => {
  it('returns the movie from the service', async () => {
    mocked.getMovie.mockResolvedValue(movie);

    const response = await request(app).get('/movies/m1');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ movie });
    expect(mocked.getMovie).toHaveBeenCalledWith(USER_ID, 'm1');
  });

  it('propagates a 404 from the service', async () => {
    mocked.getMovie.mockRejectedValue(
      new HttpError(404, 'NOT_FOUND', 'Movie not found or unauthorized to access')
    );

    const response = await request(app).get('/movies/m1');

    expect(response.status).toBe(404);
    expect(response.body.code).toBe('NOT_FOUND');
  });

  it('does not shadow the poster sub-route', async () => {
    mocked.getPoster.mockResolvedValue({
      body: Buffer.from('<svg/>'),
      contentType: 'image/svg+xml',
      etag: '"abc"',
    });

    await request(app).get('/movies/m1/poster');

    expect(mocked.getMovie).not.toHaveBeenCalled();
    expect(mocked.getPoster).toHaveBeenCalled();
  });
});

describe('PUT /movies/:id', () => {
  it('forwards the id, the fields and an optional poster', async () => {
    mocked.updateMovie.mockResolvedValue(movie);

    const response = await request(app)
      .put('/movies/m1')
      .field('title', 'Arrival')
      .field('publicationYear', '2016');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ message: 'Movie updated successfully', movie });

    const [userId, movieId, , poster] = mocked.updateMovie.mock.calls[0];
    expect(userId).toBe(USER_ID);
    expect(movieId).toBe('m1');
    expect(poster).toBeUndefined();
  });
});

describe('DELETE /movies/:id', () => {
  it('deletes through the service', async () => {
    mocked.deleteMovie.mockResolvedValue(undefined);

    const response = await request(app).delete('/movies/m1');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ message: 'Movie deleted successfully' });
    expect(mocked.deleteMovie).toHaveBeenCalledWith(USER_ID, 'm1');
  });

  it("propagates a 404 for somebody else's movie", async () => {
    mocked.deleteMovie.mockRejectedValue(
      new HttpError(404, 'NOT_FOUND', 'Movie not found or unauthorized to delete')
    );

    const response = await request(app).delete('/movies/m1');

    expect(response.status).toBe(404);
  });
});

describe('GET /movies/:id/poster', () => {
  it('serves the bytes with an immutable cache policy and an ETag', async () => {
    mocked.getPoster.mockResolvedValue({
      body: Buffer.from('poster-bytes'),
      contentType: 'image/jpeg',
      etag: '"abc123"',
    });

    const response = await request(app).get('/movies/m1/poster?v=abc123&sig=deadbeef');

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('image/jpeg');
    expect(response.headers['cache-control']).toBe('private, max-age=31536000, immutable');
    expect(response.headers.etag).toBe('"abc123"');
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(mocked.getPoster).toHaveBeenCalledWith({
      movieId: 'm1',
      version: 'abc123',
      signature: 'deadbeef',
      authenticatedUserId: undefined,
    });
  });

  it('answers 304 when the client already has the image', async () => {
    mocked.getPoster.mockResolvedValue({
      body: Buffer.from('poster-bytes'),
      contentType: 'image/jpeg',
      etag: '"abc123"',
    });

    const response = await request(app)
      .get('/movies/m1/poster?v=abc123&sig=deadbeef')
      .set('If-None-Match', '"abc123"');

    expect(response.status).toBe(304);
  });

  it('is a 404 when the signature does not check out', async () => {
    mocked.getPoster.mockRejectedValue(new HttpError(404, 'NOT_FOUND', 'Poster not found'));

    const response = await request(app).get('/movies/m1/poster?v=abc123&sig=wrong');

    expect(response.status).toBe(404);
  });
});
