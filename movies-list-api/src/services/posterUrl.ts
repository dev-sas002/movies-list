import { createHmac, timingSafeEqual } from 'crypto';
import { getJwtSecret } from '../config/env';

/**
 * Posters are referenced from `<img>` tags, which cannot carry an
 * `Authorization` header. Rather than widen the poster route to anyone with
 * the movie id, each poster gets a capability URL: an HMAC over
 * (owner, movie, content hash) derived from the JWT secret.
 *
 * The URL is unguessable, scoped to a single image, and stable for as long as
 * that image is - which is what lets the response be cached immutably. It
 * becomes invalid the moment the poster is replaced, because the content hash
 * is part of both the signature and the query string.
 */

const DERIVATION_LABEL = 'poster-url-v1';
const SIGNATURE_LENGTH = 32;

const signingKey = (): Buffer =>
  createHmac('sha256', getJwtSecret()).update(DERIVATION_LABEL).digest();

/** The short content-version marker that appears in the URL. */
export const posterVersion = (imageHash: string): string => imageHash.slice(0, 16);

export const signPoster = (userId: string, movieId: string, imageHash: string): string =>
  createHmac('sha256', signingKey())
    .update(`${userId}:${movieId}:${posterVersion(imageHash)}`)
    .digest('hex')
    .slice(0, SIGNATURE_LENGTH);

export const buildPosterUrl = (
  userId: string,
  movieId: string,
  imageHash: string | undefined
): string | null => {
  if (!imageHash) {
    return null;
  }

  const signature = signPoster(userId, movieId, imageHash);
  return `/movies/${movieId}/poster?v=${posterVersion(imageHash)}&sig=${signature}`;
};

export const verifyPosterSignature = (
  userId: string,
  movieId: string,
  imageHash: string | undefined,
  candidate: string | undefined
): boolean => {
  if (!imageHash || !candidate || candidate.length !== SIGNATURE_LENGTH) {
    return false;
  }

  const expected = Buffer.from(signPoster(userId, movieId, imageHash));
  const provided = Buffer.from(candidate);

  return expected.length === provided.length && timingSafeEqual(expected, provided);
};
