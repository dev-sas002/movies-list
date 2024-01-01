import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Movie } from "contracts/api";
import { MovieForm } from "components/MovieForm";
import { ROUTES } from "constants/routes";
import { getMovie } from "services/api";
import { getToken } from "services/session";

export const EditMovie = (): JSX.Element => {
  const location = useLocation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  // The movie is normally handed over through router state when coming from
  // the list. On a direct visit / page refresh that state is gone, so fall
  // back to fetching it - previously the page just rendered an empty shell.
  const handedOver = (location.state as { movie?: Movie } | null)?.movie ?? null;

  const [movie, setMovie] = useState<Movie | null>(handedOver);
  const [isLoading, setIsLoading] = useState(!handedOver);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (movie || !id) {
      return;
    }

    let isActive = true;

    const fetchMovie = async () => {
      const userToken = getToken();

      if (!userToken) {
        navigate(ROUTES.signin);
        return;
      }

      try {
        const fetched = await getMovie(id, userToken);
        if (isActive) {
          setMovie(fetched);
        }
      } catch (err) {
        if (isActive) {
          setError("We could not load this movie.");
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    fetchMovie();

    return () => {
      isActive = false;
    };
  }, [id, movie, navigate]);

  return (
    <main className="main-container">
      <h1 className="mb-10 text-4xl font-semibold text-white sm:text-5xl">Edit movie</h1>
      {isLoading && <p className="text-white/70">Loading…</p>}
      {error && (
        <p className="text-error" role="alert">
          {error}
        </p>
      )}
      {movie && <MovieForm isEditState initialData={movie} />}
    </main>
  );
};
