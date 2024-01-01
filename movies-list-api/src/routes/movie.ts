import express, { Request, Response } from 'express';
import multer from 'multer';
import { getMaxUploadBytes } from '../config/env';
import authMiddleware, { optionalAuth } from '../middlewares/auth';
import { asyncRoute } from '../middlewares/asyncRoute';
import * as movieService from '../services/movieService';

/**
 * HTTP adapters only: read the request, call a use case, write the response.
 * Validation, authorisation rules and persistence all live below this file.
 */

const movieRouter = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: getMaxUploadBytes(), files: 1 },
});

const currentUserId = (req: Request): string => String(req.user?._id);

const poster = (req: Request) =>
  req.file ? { buffer: req.file.buffer, mimetype: req.file.mimetype } : undefined;

const movieInput = (req: Request) => ({
  title: req.body.title,
  publicationYear: req.body.publicationYear,
  synopsis: req.body.synopsis,
  tags: req.body.tags,
});

movieRouter.get(
  '/movies',
  authMiddleware,
  asyncRoute(async (req: Request, res: Response) => {
    const result = await movieService.listMovies({
      userId: currentUserId(req),
      page: req.query.page,
      pageSize: req.query.pageSize,
      q: req.query.q,
      sort: req.query.sort,
    });

    res.status(200).json(result);
  })
);

movieRouter.post(
  '/movies',
  authMiddleware,
  upload.single('image'),
  asyncRoute(async (req: Request, res: Response) => {
    const movie = await movieService.createMovie(currentUserId(req), movieInput(req), poster(req));

    res.status(201).json({ message: 'Movie created successfully', movie });
  })
);

/**
 * Poster bytes. Reachable either with a bearer token or through the signed URL
 * that list and detail responses hand out, because an `<img>` tag cannot send
 * an Authorization header.
 */
movieRouter.get(
  '/movies/:id/poster',
  optionalAuth,
  asyncRoute(async (req: Request, res: Response) => {
    const result = await movieService.getPoster({
      movieId: req.params.id,
      version: typeof req.query.v === 'string' ? req.query.v : undefined,
      signature: typeof req.query.sig === 'string' ? req.query.sig : undefined,
      authenticatedUserId: req.user ? String(req.user._id) : undefined,
    });

    res.set({
      'Content-Type': result.contentType,
      // The URL carries the content hash, so a cached copy can never be stale.
      'Cache-Control': 'private, max-age=31536000, immutable',
      ETag: result.etag,
      // Defence in depth for image formats that can carry script (SVG).
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; sandbox",
      'Content-Disposition': 'inline',
    });

    if (req.header('If-None-Match') === result.etag) {
      res.status(304).end();
      return;
    }

    res.status(200).send(result.body);
  })
);

movieRouter.get(
  '/movies/:id',
  authMiddleware,
  asyncRoute(async (req: Request, res: Response) => {
    const movie = await movieService.getMovie(currentUserId(req), req.params.id);

    res.status(200).json({ movie });
  })
);

movieRouter.put(
  '/movies/:id',
  authMiddleware,
  upload.single('image'),
  asyncRoute(async (req: Request, res: Response) => {
    const movie = await movieService.updateMovie(
      currentUserId(req),
      req.params.id,
      movieInput(req),
      poster(req)
    );

    res.status(200).json({ message: 'Movie updated successfully', movie });
  })
);

movieRouter.delete(
  '/movies/:id',
  authMiddleware,
  asyncRoute(async (req: Request, res: Response) => {
    await movieService.deleteMovie(currentUserId(req), req.params.id);

    res.status(200).json({ message: 'Movie deleted successfully' });
  })
);

export default movieRouter;
