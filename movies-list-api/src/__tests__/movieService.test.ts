import * as movieRepository from '../repositories/movieRepository';
import { HttpError } from '../errors/httpError';
import { setSearchPlanner } from '../search';
import { SearchPlanner } from '../search/types';
import * as movieService from '../services/movieService';
import { signPoster } from '../services/posterUrl';

jest.mock('../repositories/movieRepository', () => {
  const actual = jest.requireActual('../repositories/movieRepository');
  return {
    ...actual,
    list: jest.fn(),
    findById: jest.fn(),
    findPoster: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };
});

const repo = movieRepository as jest.Mocked<typeof movieRepository>;

const USER_ID = '65900000000000000000000a';
const MOVIE_ID = '65900000000000000000000b';
const HASH = 'a'.repeat(64);

const doc = (overrides: Record<string, unknown> = {}) =>
  ({
    _id: MOVIE_ID,
    userId: USER_ID,
    title: 'Arrival',
    publishYear: 2016,
    synopsis: 'A linguist talks to visitors.',
    tags: ['sci-fi'],
    imageType: 'image/jpeg',
    imageHash: HASH,
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-02T00:00:00.000Z'),
    ...overrides,
  }) as never;

const jpeg = { buffer: Buffer.from('poster-bytes'), mimetype: 'image/jpeg' };

beforeEach(() => {
  jest.clearAllMocks();
  movieService.clearListCache();
  setSearchPlanner(null);
});

describe('toDto', () => {
  it('replaces the poster bytes with a signed, versioned url', () => {
    const dto = movieService.toDto(doc());

    expect(dto).not.toHaveProperty('image');
    expect(dto.posterUrl).toBe(
      `/movies/${MOVIE_ID}/poster?v=${HASH.slice(0, 16)}&sig=${signPoster(USER_ID, MOVIE_ID, HASH)}`
    );
    expect(dto.createdAt).toBe('2024-01-01T00:00:00.000Z');
  });

  it('returns a null poster url for a movie with no image', () => {
    expect(movieService.toDto(doc({ imageHash: undefined })).posterUrl).toBeNull();
  });
});

describe('parseTags', () => {
  it('normalises, de-duplicates and caps the tag list', () => {
    expect(movieService.parseTags(' Sci-Fi , drama,SCI-FI , ')).toEqual(['sci-fi', 'drama']);
    expect(movieService.parseTags(['Heist', 'crime'])).toEqual(['heist', 'crime']);
    expect(movieService.parseTags(undefined)).toEqual([]);
    expect(movieService.parseTags(new Array(30).fill(0).map((_, i) => `t${i}`))).toHaveLength(12);
  });
});

describe('listMovies', () => {
  beforeEach(() => {
    repo.list.mockResolvedValue({ movies: [doc()], total: 25 });
  });

  it('defaults to page 1 with 12 items, newest first', async () => {
    const result = await movieService.listMovies({ userId: USER_ID });

    expect(repo.list).toHaveBeenCalledWith({
      userId: USER_ID,
      filter: { text: null, yearFrom: null, yearTo: null, tags: [] },
      sort: 'newest',
      skip: 0,
      limit: 12,
    });
    expect(result.pagination).toEqual({
      page: 1,
      pageSize: 12,
      total: 25,
      totalPages: 3,
      hasMore: true,
    });
    expect(result.interpretation).toBeNull();
  });

  it('translates page/pageSize into skip/limit and clamps hostile input', async () => {
    await movieService.listMovies({ userId: USER_ID, page: '3', pageSize: '5' });
    expect(repo.list.mock.calls[0][0]).toMatchObject({ skip: 10, limit: 5 });

    await movieService.listMovies({ userId: USER_ID, page: '-4', pageSize: '-5' });
    expect(repo.list.mock.calls[1][0]).toMatchObject({ skip: 0, limit: 1 });

    await movieService.listMovies({ userId: USER_ID, pageSize: '100000' });
    expect(repo.list.mock.calls[2][0]).toMatchObject({ limit: 100 });

    await movieService.listMovies({ userId: USER_ID, page: 'abc', pageSize: 'xyz' });
    expect(repo.list.mock.calls[3][0]).toMatchObject({ skip: 0, limit: 12 });
  });

  it('runs a free-text query through the search planner and reports the reading', async () => {
    const result = await movieService.listMovies({
      userId: USER_ID,
      q: '90s sci-fi, oldest first',
    });

    expect(repo.list.mock.calls[0][0].filter).toMatchObject({
      yearFrom: 1990,
      yearTo: 1999,
      tags: ['sci-fi'],
    });
    expect(result.interpretation).toMatchObject({
      source: 'rules',
      yearFrom: 1990,
      sort: 'oldest',
    });
    expect(result.interpretation?.summary).toContain('1990');
  });

  it('lets an explicit sort control override one inferred from the prose', async () => {
    await movieService.listMovies({ userId: USER_ID, q: 'newest sci-fi', sort: 'title' });

    expect(repo.list.mock.calls[0][0].sort).toBe('title');
  });

  it('ignores an unknown sort value', async () => {
    await movieService.listMovies({ userId: USER_ID, sort: 'drop-table' });

    expect(repo.list.mock.calls[0][0].sort).toBe('newest');
  });

  it('delegates to a registered planner, whichever one it is', async () => {
    const planner: SearchPlanner = {
      name: 'stub',
      plan: jest.fn().mockResolvedValue({
        filter: { text: 'heist', yearFrom: null, yearTo: null, tags: ['crime'] },
        sort: 'title',
        source: 'ai',
      }),
    };
    setSearchPlanner(planner);

    const result = await movieService.listMovies({ userId: USER_ID, q: 'a caper' });

    expect(planner.plan).toHaveBeenCalledWith('a caper');
    expect(result.interpretation?.source).toBe('ai');
  });

  it('serves a repeated page from cache instead of hitting the database again', async () => {
    await movieService.listMovies({ userId: USER_ID });
    await movieService.listMovies({ userId: USER_ID });

    expect(repo.list).toHaveBeenCalledTimes(1);
  });

  it('does not serve one user a page cached for another', async () => {
    await movieService.listMovies({ userId: USER_ID });
    await movieService.listMovies({ userId: 'another-user' });

    expect(repo.list).toHaveBeenCalledTimes(2);
  });

  it('drops the cached pages of the user that wrote', async () => {
    await movieService.listMovies({ userId: USER_ID });
    repo.create.mockResolvedValue(doc());

    await movieService.createMovie(USER_ID, { title: 'Dune', publicationYear: '2021' }, jpeg);
    await movieService.listMovies({ userId: USER_ID });

    expect(repo.list).toHaveBeenCalledTimes(2);
  });
});

describe('getMovie', () => {
  it('rejects a malformed id without querying', async () => {
    await expect(movieService.getMovie(USER_ID, 'not-an-id')).rejects.toMatchObject({
      status: 404,
    });
    expect(repo.findById).not.toHaveBeenCalled();
  });

  it('404s a movie owned by somebody else', async () => {
    repo.findById.mockResolvedValue(null);

    await expect(movieService.getMovie(USER_ID, MOVIE_ID)).rejects.toBeInstanceOf(HttpError);
    expect(repo.findById).toHaveBeenCalledWith(USER_ID, MOVIE_ID);
  });

  it('returns the movie scoped to the caller', async () => {
    repo.findById.mockResolvedValue(doc());

    await expect(movieService.getMovie(USER_ID, MOVIE_ID)).resolves.toMatchObject({
      title: 'Arrival',
    });
  });
});

describe('createMovie', () => {
  it('requires a poster', async () => {
    await expect(
      movieService.createMovie(USER_ID, { title: 'Dune', publicationYear: '2021' }, undefined)
    ).rejects.toMatchObject({ status: 400, message: expect.stringContaining('poster') });
  });

  it('requires a title', async () => {
    await expect(
      movieService.createMovie(USER_ID, { title: '   ', publicationYear: '2021' }, jpeg)
    ).rejects.toMatchObject({ status: 400, message: 'A title is required' });
  });

  it.each([['not-a-year'], ['1500'], ['2016.5'], [undefined]])(
    'rejects the publishing year %p',
    async (year) => {
      await expect(
        movieService.createMovie(USER_ID, { title: 'Dune', publicationYear: year }, jpeg)
      ).rejects.toMatchObject({ status: 400 });
    }
  );

  it('rejects a poster that is not an image we serve', async () => {
    await expect(
      movieService.createMovie(
        USER_ID,
        { title: 'Dune', publicationYear: '2021' },
        { buffer: Buffer.from('%PDF'), mimetype: 'application/pdf' }
      )
    ).rejects.toMatchObject({ status: 415 });
  });

  it('stores the parsed movie with a content hash for the poster', async () => {
    repo.create.mockResolvedValue(doc());

    await movieService.createMovie(
      USER_ID,
      { title: '  Dune  ', publicationYear: '2021', synopsis: ' Spice. ', tags: 'Sci-Fi, epic' },
      jpeg
    );

    const stored = repo.create.mock.calls[0][0];
    expect(stored).toMatchObject({
      title: 'Dune',
      publishYear: 2021,
      synopsis: 'Spice.',
      tags: ['sci-fi', 'epic'],
      imageType: 'image/jpeg',
      userId: USER_ID,
    });
    expect(stored.imageHash).toHaveLength(64);
  });
});

describe('updateMovie', () => {
  it('leaves the stored poster untouched when no new file is uploaded', async () => {
    repo.update.mockResolvedValue(doc());

    await movieService.updateMovie(
      USER_ID,
      MOVIE_ID,
      { title: 'Arrival', publicationYear: '2016' },
      undefined
    );

    const changes = repo.update.mock.calls[0][2];
    expect(changes).not.toHaveProperty('image');
    expect(changes).toMatchObject({ title: 'Arrival', publishYear: 2016 });
  });

  it('replaces the poster and its hash when a new file is uploaded', async () => {
    repo.update.mockResolvedValue(doc());

    await movieService.updateMovie(
      USER_ID,
      MOVIE_ID,
      { title: 'Arrival', publicationYear: '2016' },
      jpeg
    );

    const changes = repo.update.mock.calls[0][2] as Record<string, unknown>;
    expect(Buffer.from(changes.image as Buffer).toString()).toBe('poster-bytes');
    expect(changes.imageHash).toHaveLength(64);
  });

  it("404s when the movie is not the caller's", async () => {
    repo.update.mockResolvedValue(null);

    await expect(
      movieService.updateMovie(
        USER_ID,
        MOVIE_ID,
        { title: 'Arrival', publicationYear: '2016' },
        undefined
      )
    ).rejects.toMatchObject({ status: 404 });
  });

  it('validates before touching the database', async () => {
    await expect(
      movieService.updateMovie(USER_ID, MOVIE_ID, { title: '', publicationYear: '2016' }, undefined)
    ).rejects.toMatchObject({ status: 400 });
    expect(repo.update).not.toHaveBeenCalled();
  });
});

describe('deleteMovie', () => {
  it('404s a malformed id', async () => {
    await expect(movieService.deleteMovie(USER_ID, 'nope')).rejects.toMatchObject({ status: 404 });
    expect(repo.remove).not.toHaveBeenCalled();
  });

  it('404s when nothing was deleted', async () => {
    repo.remove.mockResolvedValue(null);

    await expect(movieService.deleteMovie(USER_ID, MOVIE_ID)).rejects.toMatchObject({
      status: 404,
    });
  });

  it('deletes scoped to the owner', async () => {
    repo.remove.mockResolvedValue(doc());

    await movieService.deleteMovie(USER_ID, MOVIE_ID);

    expect(repo.remove).toHaveBeenCalledWith(USER_ID, MOVIE_ID);
  });
});

describe('getPoster', () => {
  const posterDoc = doc({ image: Buffer.from('<svg/>'), imageType: 'image/svg+xml' });

  it('serves the bytes for a correctly signed url', async () => {
    repo.findPoster.mockResolvedValue(posterDoc);

    const result = await movieService.getPoster({
      movieId: MOVIE_ID,
      version: HASH.slice(0, 16),
      signature: signPoster(USER_ID, MOVIE_ID, HASH),
    });

    expect(result.contentType).toBe('image/svg+xml');
    expect(result.etag).toBe(`"${HASH.slice(0, 16)}"`);
  });

  it('serves the bytes to the authenticated owner without a signature', async () => {
    repo.findPoster.mockResolvedValue(posterDoc);

    await expect(
      movieService.getPoster({ movieId: MOVIE_ID, authenticatedUserId: USER_ID })
    ).resolves.toMatchObject({ contentType: 'image/svg+xml' });
  });

  it('refuses a forged signature', async () => {
    repo.findPoster.mockResolvedValue(posterDoc);

    await expect(
      movieService.getPoster({
        movieId: MOVIE_ID,
        version: HASH.slice(0, 16),
        signature: 'f'.repeat(32),
      })
    ).rejects.toMatchObject({ status: 404 });
  });

  it('refuses a signature for a superseded version of the poster', async () => {
    repo.findPoster.mockResolvedValue(posterDoc);

    await expect(
      movieService.getPoster({
        movieId: MOVIE_ID,
        version: 'b'.repeat(16),
        signature: signPoster(USER_ID, MOVIE_ID, 'b'.repeat(64)),
      })
    ).rejects.toMatchObject({ status: 404 });
  });

  it('refuses another signed-in user', async () => {
    repo.findPoster.mockResolvedValue(posterDoc);

    await expect(
      movieService.getPoster({ movieId: MOVIE_ID, authenticatedUserId: 'somebody-else' })
    ).rejects.toMatchObject({ status: 404 });
  });

  it('404s a malformed id and a movie with no poster', async () => {
    await expect(movieService.getPoster({ movieId: 'nope' })).rejects.toMatchObject({
      status: 404,
    });

    repo.findPoster.mockResolvedValue(doc({ image: undefined }));
    await expect(
      movieService.getPoster({ movieId: MOVIE_ID, authenticatedUserId: USER_ID })
    ).rejects.toMatchObject({ status: 404 });
  });
});
