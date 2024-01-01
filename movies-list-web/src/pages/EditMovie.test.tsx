import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import { EditMovie } from "./EditMovie";
import { Movie } from "contracts/api";
import { getMovie } from "services/api";

jest.mock("services/api", () => ({
  ...jest.requireActual("services/api"),
  getMovie: jest.fn(),
}));

// The form itself is covered by MovieForm.test.tsx; stub it so these tests
// only assert on how EditMovie sources its data.
jest.mock("components/MovieForm", () => ({
  MovieForm: ({ initialData }: { initialData?: Movie }) => (
    <div data-testid="movie-form">{initialData?.title}</div>
  ),
}));

const mockedGetMovie = getMovie as jest.MockedFunction<typeof getMovie>;

const movie = (overrides: Partial<Movie> = {}): Movie => ({
  id: "m1",
  title: "Arrival",
  publishYear: 2016,
  synopsis: "Linguist meets heptapods.",
  tags: ["sci-fi"],
  posterUrl: "/movies/m1/poster?v=abc&sig=def",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  ...overrides,
});

const renderAt = (state?: { movie: Movie }) =>
  render(
    <MemoryRouter initialEntries={[{ pathname: "/movies/m1/edit", state }]}>
      <Routes>
        <Route path="/movies/:id/edit" element={<EditMovie />} />
        <Route path="/signin" element={<div>sign in</div>} />
      </Routes>
    </MemoryRouter>
  );

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
});

describe("EditMovie page", () => {
  it("uses the movie handed over through router state without refetching", async () => {
    renderAt({ movie: movie() });

    expect(await screen.findByTestId("movie-form")).toHaveTextContent("Arrival");
    expect(mockedGetMovie).not.toHaveBeenCalled();
  });

  it("fetches the movie on a direct visit / refresh", async () => {
    localStorage.setItem("userToken", "tok");
    mockedGetMovie.mockResolvedValue(movie({ title: "Dune" }));

    renderAt();

    expect(screen.getByText("Loading…")).toBeInTheDocument();

    await waitFor(() =>
      expect(screen.getByTestId("movie-form")).toHaveTextContent("Dune")
    );
    expect(mockedGetMovie).toHaveBeenCalledWith("m1", "tok");
  });

  it("reports an error instead of rendering an empty page", async () => {
    localStorage.setItem("userToken", "tok");
    mockedGetMovie.mockRejectedValue(new Error("404"));

    renderAt();

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(
        "We could not load this movie."
      )
    );
    expect(screen.queryByTestId("movie-form")).not.toBeInTheDocument();
  });

  it("sends an unauthenticated visitor to sign-in", async () => {
    renderAt();

    await waitFor(() => expect(screen.getByText("sign in")).toBeInTheDocument());
    expect(mockedGetMovie).not.toHaveBeenCalled();
  });
});
