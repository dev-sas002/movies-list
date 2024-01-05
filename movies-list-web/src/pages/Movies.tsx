import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Movie, MovieListResponse, MovieSort } from "contracts/api";
import { Button } from "components/Button";
import { MovieCard } from "components/MovieCard";
import { Pagination } from "components/Pagination";
import { SearchBar } from "components/SearchBar";
import { ReactComponent as PlusIcon } from "assets/plus-icon.svg";
import { ReactComponent as LogoutIcon } from "assets/logout-icon.svg";
import { ROUTES, editMoviePath } from "constants/routes";
import { deleteMovie, getMovies, logout, posterSrc } from "services/api";
import { clearToken, getToken } from "services/session";

const PAGE_SIZE = 8;

const EMPTY_LIST: MovieListResponse = {
  movies: [],
  pagination: { page: 1, pageSize: PAGE_SIZE, total: 0, totalPages: 1, hasMore: false },
  interpretation: null,
};

export const Movies = (): JSX.Element => {
  const navigate = useNavigate();
  const [data, setData] = useState<MovieListResponse>(EMPTY_LIST);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<MovieSort>("newest");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const userToken = getToken();

    if (!userToken) {
      navigate(ROUTES.signin);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      setData(await getMovies({ page, pageSize: PAGE_SIZE, q: query || undefined, sort }, userToken));
    } catch (err) {
      setError("We could not load your movies. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [navigate, page, query, sort]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSearch = (next: string) => {
    setPage(1);
    setQuery(next);
  };

  const handleSortChange = (next: MovieSort) => {
    setPage(1);
    setSort(next);
  };

  const handleDelete = async (movie: Movie) => {
    // eslint-disable-next-line no-restricted-globals
    if (!window.confirm(`Remove “${movie.title}” from your list?`)) {
      return;
    }

    try {
      await deleteMovie(movie.id, getToken());
      await load();
    } catch (err) {
      setError("We could not delete that movie. Please try again.");
    }
  };

  const handleLogout = async () => {
    try {
      await logout(getToken());
    } catch (err) {
      // The local session must be dropped even if the server call failed,
      // otherwise the user stays "logged in" with a token they cannot use.
    } finally {
      clearToken();
      navigate(ROUTES.signin);
    }
  };

  const isSearching = query.length > 0;
  const isEmptyCollection = !isLoading && !error && data.movies.length === 0 && !isSearching;

  if (isEmptyCollection) {
    return (
      <main className="main-container flex min-h-[80vh] flex-col items-center justify-center text-center">
        <h1 className="mb-3 text-4xl font-semibold text-white">Your movie list is empty</h1>
        <p className="mb-8 max-w-md text-white/70">
          Add your first film and it will show up here with its poster, year and tags.
        </p>
        <Button onClick={() => navigate(ROUTES.newMovie)}>Add a new movie</Button>
      </main>
    );
  }

  return (
    <main className="main-container">
      <header className="mb-10 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-4xl font-semibold text-white sm:text-5xl">My Movies</h1>
          <button
            type="button"
            aria-label="Add a new movie"
            onClick={() => navigate(ROUTES.newMovie)}
            className="rounded-full p-2 transition hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <PlusIcon />
          </button>
        </div>
        <button
          type="button"
          className="flex items-center gap-2 text-white transition hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg px-2 py-1"
          onClick={handleLogout}
        >
          Logout <LogoutIcon />
        </button>
      </header>

      <SearchBar
        query={query}
        sort={sort}
        interpretation={data.interpretation}
        onSearch={handleSearch}
        onSortChange={handleSortChange}
      />

      {error && (
        <div className="mb-8 flex items-center gap-4 rounded-lg border border-error/40 bg-error/10 px-4 py-3">
          <p className="text-error" role="alert">
            {error}
          </p>
          <Button variant="secondary" onClick={load}>
            Try again
          </Button>
        </div>
      )}

      {isLoading && (
        <div
          className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          aria-hidden="true"
        >
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="animate-pulse rounded-xl bg-cardColor p-2">
              <div className="aspect-[2/3] w-full rounded-xl bg-inputColor" />
              <div className="mt-4 h-4 w-2/3 rounded bg-inputColor" />
              <div className="mt-2 h-3 w-1/3 rounded bg-inputColor" />
            </div>
          ))}
        </div>
      )}

      {!isLoading && !error && data.movies.length === 0 && isSearching && (
        <div className="rounded-xl border border-white/10 bg-cardColor/60 px-6 py-12 text-center">
          <p className="text-lg text-white">Nothing matched “{query}”.</p>
          <p className="mt-2 text-white/60">Try a broader search, or clear it to see everything.</p>
          <Button className="mt-6" variant="secondary" onClick={() => handleSearch("")}>
            Clear search
          </Button>
        </div>
      )}

      {!isLoading && data.movies.length > 0 && (
        <>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {data.movies.map((movie) => (
              <MovieCard
                key={movie.id}
                title={movie.title}
                year={movie.publishYear}
                tags={movie.tags}
                image={posterSrc(movie)}
                onEditClick={() => navigate(editMoviePath(movie.id), { state: { movie } })}
                onDeleteClick={() => handleDelete(movie)}
              />
            ))}
          </div>
          <Pagination pagination={data.pagination} onPageChange={setPage} />
        </>
      )}
    </main>
  );
};
