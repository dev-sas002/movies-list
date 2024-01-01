export const ROUTES = {
  signin: '/signin',
  movies: '/movies',
  newMovie: '/movies/new',
  editMovie: '/movies/:id/edit',
};

/**
 * Builds a concrete edit URL from the `/movies/:id/edit` pattern.
 * Interpolating with a template literal instead produced
 * `/movies/:id/edit/<id>`, which matched no route.
 */
export const editMoviePath = (movieId: string): string =>
  ROUTES.editMovie.replace(':id', encodeURIComponent(movieId));
