import Movie from '../models/movie';
import * as movieRepository from '../repositories/movieRepository';

const USER_ID = '65900000000000000000000a';

const emptyFilter = { text: null, yearFrom: null, yearTo: null, tags: [] };

/** Builds the `find().select().sort().skip().limit().lean().exec()` chain. */
const mockFindChain = (result: unknown) => {
  const exec = jest.fn().mockResolvedValue(result);
  const lean = jest.fn().mockReturnValue({ exec });
  const limit = jest.fn().mockReturnValue({ lean });
  const skip = jest.fn().mockReturnValue({ limit });
  const sort = jest.fn().mockReturnValue({ skip });
  const select = jest.fn().mockReturnValue({ sort });
  jest.spyOn(Movie, 'find').mockReturnValue({ select } as never);
  jest.spyOn(Movie, 'countDocuments').mockReturnValue({
    exec: jest.fn().mockResolvedValue(7),
  } as never);

  return { select, sort, skip, limit, exec };
};

afterEach(() => {
  jest.restoreAllMocks();
});

describe('buildQuery', () => {
  it('always scopes to the owner', () => {
    expect(movieRepository.buildQuery(USER_ID, emptyFilter)).toEqual({ userId: USER_ID });
  });

  it('turns year bounds into a range query', () => {
    expect(
      movieRepository.buildQuery(USER_ID, { ...emptyFilter, yearFrom: 1990, yearTo: 1999 })
    ).toEqual({ userId: USER_ID, publishYear: { $gte: 1990, $lte: 1999 } });

    expect(movieRepository.buildQuery(USER_ID, { ...emptyFilter, yearFrom: 2000 })).toEqual({
      userId: USER_ID,
      publishYear: { $gte: 2000 },
    });

    expect(movieRepository.buildQuery(USER_ID, { ...emptyFilter, yearTo: 1979 })).toEqual({
      userId: USER_ID,
      publishYear: { $lte: 1979 },
    });
  });

  it('matches any of the requested tags', () => {
    expect(
      movieRepository.buildQuery(USER_ID, { ...emptyFilter, tags: ['sci-fi', 'noir'] })
    ).toEqual({ userId: USER_ID, tags: { $in: ['sci-fi', 'noir'] } });
  });

  it('uses the text index rather than an unindexable regex scan', () => {
    expect(movieRepository.buildQuery(USER_ID, { ...emptyFilter, text: 'female lead' })).toEqual({
      userId: USER_ID,
      $text: { $search: 'female lead' },
    });
  });
});

describe('list', () => {
  it('excludes the poster bytes from the projection', async () => {
    const chain = mockFindChain([]);

    await movieRepository.list({
      userId: USER_ID,
      filter: emptyFilter,
      sort: 'newest',
      skip: 0,
      limit: 12,
    });

    expect(chain.select).toHaveBeenCalledWith(expect.not.stringContaining('image '));
    expect(chain.select.mock.calls[0][0]).not.toMatch(/(^|\s)image(\s|$)/);
  });

  it('paginates in the database, not in memory', async () => {
    const chain = mockFindChain([]);

    await movieRepository.list({
      userId: USER_ID,
      filter: emptyFilter,
      sort: 'newest',
      skip: 24,
      limit: 12,
    });

    expect(chain.skip).toHaveBeenCalledWith(24);
    expect(chain.limit).toHaveBeenCalledWith(12);
  });

  it.each([
    ['newest', { createdAt: -1 }],
    ['oldest', { createdAt: 1 }],
    ['title', { title: 1 }],
    ['year-desc', { publishYear: -1 }],
    ['year-asc', { publishYear: 1 }],
  ] as const)('sorts %s by an indexed key', async (sort, expected) => {
    const chain = mockFindChain([]);

    await movieRepository.list({ userId: USER_ID, filter: emptyFilter, sort, skip: 0, limit: 12 });

    expect(chain.sort).toHaveBeenCalledWith(expected);
  });

  it('returns the page alongside the total for pagination', async () => {
    mockFindChain([{ _id: 'm1' }]);

    const result = await movieRepository.list({
      userId: USER_ID,
      filter: emptyFilter,
      sort: 'newest',
      skip: 0,
      limit: 12,
    });

    expect(result).toEqual({ movies: [{ _id: 'm1' }], total: 7 });
  });
});

describe('id validation', () => {
  it('accepts an object id and rejects anything else', () => {
    expect(movieRepository.isValidId(USER_ID)).toBe(true);
    expect(movieRepository.isValidId('not-an-object-id')).toBe(false);
  });
});

describe('schema indexes', () => {
  const indexes = Movie.schema.indexes().map(([fields]) => fields);

  it.each([
    ['userId and createdAt', { userId: 1, createdAt: -1 }],
    ['userId and publishYear', { userId: 1, publishYear: -1 }],
    ['userId and tags', { userId: 1, tags: 1 }],
  ])('declares a compound index on %s', (_name, expected) => {
    expect(indexes).toContainEqual(expected);
  });

  it('declares a weighted text index for free-text search', () => {
    expect(indexes).toContainEqual({ title: 'text', synopsis: 'text', tags: 'text' });
  });
});
