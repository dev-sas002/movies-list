import mongoose, { Schema, Document } from 'mongoose';

export interface IMovie extends Document {
  title: string;
  publishYear: number;
  synopsis: string;
  tags: string[];
  /** Poster bytes. Excluded from every projection except the poster route. */
  image?: Buffer;
  imageType?: string;
  /** SHA-256 of `image`; drives the immutable poster URL and the ETag. */
  imageHash?: string;
  userId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const movieSchema: Schema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    publishYear: { type: Number, required: true },
    synopsis: { type: String, default: '', trim: true },
    tags: { type: [String], default: [], index: false },
    image: { type: Buffer },
    imageType: { type: String },
    imageHash: { type: String },
    userId: { type: mongoose.Types.ObjectId, required: true },
  },
  { timestamps: true }
);

// Every list query filters by `userId` and then orders by one of these keys;
// without the compound indexes Mongo collection-scans the whole collection and
// sorts in memory, which fails outright past 32 MB of matching documents.
movieSchema.index({ userId: 1, createdAt: -1 });
movieSchema.index({ userId: 1, publishYear: -1 });
movieSchema.index({ userId: 1, title: 1 });
movieSchema.index({ userId: 1, tags: 1 });

// Backs free-text search. Weighted so a title hit outranks a synopsis hit.
movieSchema.index(
  { title: 'text', synopsis: 'text', tags: 'text' },
  { name: 'movie_text', weights: { title: 10, tags: 5, synopsis: 1 } }
);

const Movie = mongoose.model<IMovie>('Movie', movieSchema);

/** Fields that are safe (and cheap) to return in list and detail responses. */
export const MOVIE_PROJECTION =
  'title publishYear synopsis tags imageType imageHash userId createdAt updatedAt';

export default Movie;
