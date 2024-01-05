import {
  buildPosterUrl,
  posterVersion,
  signPoster,
  verifyPosterSignature,
} from '../services/posterUrl';

const USER = 'user-1';
const MOVIE = 'movie-1';
const HASH = 'abcdef0123456789'.repeat(4);

describe('poster URLs', () => {
  it('builds a url carrying the content version and a signature', () => {
    expect(buildPosterUrl(USER, MOVIE, HASH)).toBe(
      `/movies/${MOVIE}/poster?v=${posterVersion(HASH)}&sig=${signPoster(USER, MOVIE, HASH)}`
    );
  });

  it('has no url for a movie without a poster', () => {
    expect(buildPosterUrl(USER, MOVIE, undefined)).toBeNull();
  });

  it('produces a stable signature so the browser cache is not busted on every list', () => {
    expect(signPoster(USER, MOVIE, HASH)).toBe(signPoster(USER, MOVIE, HASH));
  });

  it('binds the signature to the owner, the movie and the image', () => {
    const signature = signPoster(USER, MOVIE, HASH);

    expect(signPoster('other-user', MOVIE, HASH)).not.toBe(signature);
    expect(signPoster(USER, 'other-movie', HASH)).not.toBe(signature);
    expect(signPoster(USER, MOVIE, 'f'.repeat(64))).not.toBe(signature);
  });

  it('verifies a genuine signature and rejects everything else', () => {
    expect(verifyPosterSignature(USER, MOVIE, HASH, signPoster(USER, MOVIE, HASH))).toBe(true);
    expect(verifyPosterSignature(USER, MOVIE, HASH, signPoster('other', MOVIE, HASH))).toBe(false);
    expect(verifyPosterSignature(USER, MOVIE, HASH, undefined)).toBe(false);
    expect(verifyPosterSignature(USER, MOVIE, HASH, 'short')).toBe(false);
    expect(verifyPosterSignature(USER, MOVIE, undefined, 'a'.repeat(32))).toBe(false);
  });

  it('does not put the session token in the url', () => {
    expect(buildPosterUrl(USER, MOVIE, HASH)).not.toContain('Bearer');
    expect(signPoster(USER, MOVIE, HASH)).toHaveLength(32);
  });
});
