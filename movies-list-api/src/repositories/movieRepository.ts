import mongoose from 'mongoose';
import Movie, { IMovie, MOVIE_PROJECTION } from '../models/movie';
import { MovieSort } from '../contracts/api';

/**
 * All Mongoose access for movies. Nothing above this layer knows about query
 * operators, projections or indexes.
 */

/** A resolved, database-shaped query. Produced by the search planner. */
export interface MovieFilter {
  text: string | null;
  yearFrom: number | null;
  yearTo: number | null;
  tags: string[];
}

export interface ListOptions {
  userId: string;
  filter: MovieFilter;
  sort: MovieSort;
  skip: number;
  limit: number;
}

const SORT_SPECS: Record<MovieSort, Record<string, 1 | -1>> = {
  newest: { createdAt: -1 },
  oldest: { createdAt: 1 },
  title: { title: 1 },
  'year-desc': { publishYear: -1 },
  'year-asc': { publishYear: 1 },
};

/** Translates a filter into a Mongo query document. Exported for testing. */
export const buildQuery = (userId: string, filter: MovieFilter): Record<string, unknown> => {
  const query: Record<string, unknown> = { userId };

  if (filter.yearFrom !== null || filter.yearTo !== null) {
    const range: Record<string, number> = {};
    if (filter.yearFrom !== null) range.$gte = filter.yearFrom;
    if (filter.yearTo !== null) range.$lte = filter.yearTo;
    query.publishYear = range;
  }

  if (filter.tags.length > 0) {
    query.tags = { $in: filter.tags };
  }

  if (filter.text) {
    // Served by the `movie_text` index; a regex scan would not be.
    query.$text = { $search: filter.text };
  }

  return query;
};

export const isValidId = (id: string): boolean => mongoose.Types.ObjectId.isValid(id);

/**
 * One round trip for the page and one for the count. The poster bytes are
 * excluded from the projection - returning them inline is what made the old
 * list response megabytes wide.
 */
export const list = async (options: ListOptions): Promise<{ movies: IMovie[]; total: number }> => {
  const query = buildQuery(options.userId, options.filter);

  const [movies, total] = await Promise.all([
    Movie.find(query)
      .select(MOVIE_PROJECTION)
      .sort(SORT_SPECS[options.sort])
      .skip(options.skip)
      .limit(options.limit)
      .lean<IMovie[]>()
      .exec(),
    Movie.countDocuments(query).exec(),
  ]);

  return { movies, total };
};

export const findById = (userId: string, movieId: string): Promise<IMovie | null> =>
  Movie.findOne({ _id: movieId, userId })
    .select(MOVIE_PROJECTION)
    .lean<IMovie>()
    .exec() as Promise<IMovie | null>;

/** Loads the poster bytes only. Used by the poster route and nothing else. */
export const findPoster = (movieId: string): Promise<IMovie | null> =>
  Movie.findById(movieId)
    .select('image imageType imageHash userId')
    .lean<IMovie>()
    .exec() as Promise<IMovie | null>;

export const create = async (data: Partial<IMovie>): Promise<IMovie> => {
  const movie = new Movie(data);
  await movie.save();
  return movie;
};

export const update = (
  userId: string,
  movieId: string,
  changes: Record<string, unknown>
): Promise<IMovie | null> =>
  Movie.findOneAndUpdate(
    { _id: movieId, userId },
    { $set: changes },
    { new: true, projection: MOVIE_PROJECTION }
  ).lean<IMovie>() as unknown as Promise<IMovie | null>;

export const remove = (userId: string, movieId: string): Promise<IMovie | null> =>
  Movie.findOneAndDelete({ _id: movieId, userId })
    .select('_id')
    .lean<IMovie>() as unknown as Promise<IMovie | null>;
