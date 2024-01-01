import { MovieForm } from "components/MovieForm";

export const NewMovie = (): JSX.Element => {
  return (
    <main className="main-container">
      <h1 className="mb-10 text-4xl font-semibold text-white sm:text-5xl">
        Create a new movie
      </h1>
      <MovieForm />
    </main>
  );
};
