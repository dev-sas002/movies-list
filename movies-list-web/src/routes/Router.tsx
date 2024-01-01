import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { ROUTES } from "constants/routes";

/**
 * Routes are code-split. Sign-in is the only screen an unauthenticated visitor
 * sees, and the create/edit screens pull in the dropzone and the whole poster
 * upload path - none of which belongs in the bundle that renders the list.
 */
const Signin = lazy(() =>
  import("pages/Signin").then((m) => ({ default: m.Signin }))
);
const Movies = lazy(() =>
  import("pages/Movies").then((m) => ({ default: m.Movies }))
);
const NewMovie = lazy(() =>
  import("pages/NewMovie").then((m) => ({ default: m.NewMovie }))
);
const EditMovie = lazy(() =>
  import("pages/EditMovie").then((m) => ({ default: m.EditMovie }))
);

/** Shown while a route chunk is in flight. */
const RouteFallback = (): JSX.Element => (
  <div className="main-container flex min-h-[60vh] items-center justify-center">
    <span className="sr-only">Loading</span>
    <div
      aria-hidden="true"
      className="h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-primary"
    />
  </div>
);

export const Router = (): JSX.Element => {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path={ROUTES.signin} element={<Signin />} />
        <Route path={ROUTES.movies} element={<Movies />} />
        <Route path={ROUTES.newMovie} element={<NewMovie />} />
        <Route path={ROUTES.editMovie} element={<EditMovie />} />
        <Route path="*" element={<Navigate to={ROUTES.signin} replace />} />
      </Routes>
    </Suspense>
  );
};
