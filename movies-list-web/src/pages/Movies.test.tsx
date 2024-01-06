import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

import { Movies } from "./Movies";
import { Movie, MovieListResponse, Pagination } from "contracts/api";
import { deleteMovie, getMovies, logout } from "../services/api";

jest.mock("../services/api", () => ({
  ...jest.requireActual("../services/api"),
  getMovies: jest.fn(),
  deleteMovie: jest.fn(),
  logout: jest.fn(),
}));

const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));

const mockedGetMovies = getMovies as jest.MockedFunction<typeof getMovies>;
const mockedDeleteMovie = deleteMovie as jest.MockedFunction<typeof deleteMovie>;
const mockedLogout = logout as jest.MockedFunction<typeof logout>;

const renderMovies = () =>
  render(
    <MemoryRouter>
      <Movies />
    </MemoryRouter>
  );

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

const page = (
  movies: Movie[],
  pagination: Partial<Pagination> = {},
  interpretation: MovieListResponse["interpretation"] = null
): MovieListResponse => ({
  movies,
  pagination: {
    page: 1,
    pageSize: 8,
    total: movies.length,
    totalPages: 1,
    hasMore: false,
    ...pagination,
  },
  interpretation,
});

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  jest.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("Movies page", () => {
  it("redirects to sign-in when there is no token", async () => {
    renderMovies();

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/signin"));
    expect(mockedGetMovies).not.toHaveBeenCalled();
  });

  it("shows a loading state before the request resolves", async () => {
    localStorage.setItem("userToken", "tok");
    let resolve: (value: MovieListResponse) => void = () => {};
    mockedGetMovies.mockReturnValue(
      new Promise<MovieListResponse>((r) => {
        resolve = r;
      })
    );

    renderMovies();

    // The skeleton grid stands in for the movies while the page is in flight.
    expect(document.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);

    resolve(page([]));
    await waitFor(() =>
      expect(screen.getByText("Your movie list is empty")).toBeInTheDocument()
    );
  });

  it("distinguishes a failed request from an empty list", async () => {
    localStorage.setItem("userToken", "tok");
    mockedGetMovies.mockRejectedValue(new Error("network"));

    renderMovies();

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(
        "We could not load your movies"
      )
    );
    expect(screen.queryByText("Your movie list is empty")).not.toBeInTheDocument();
  });

  it("renders the fetched movies with their posters and tags", async () => {
    localStorage.setItem("userToken", "tok");
    mockedGetMovies.mockResolvedValue(
      page([movie(), movie({ id: "m2", title: "Dune", tags: ["sci-fi", "epic"] })])
    );

    renderMovies();

    await waitFor(() => expect(screen.getByText("Arrival")).toBeInTheDocument());
    expect(screen.getByText("Dune")).toBeInTheDocument();

    // The poster is loaded from the signed URL, not inlined in the JSON.
    expect(screen.getByAltText("Arrival poster")).toHaveAttribute(
      "src",
      expect.stringContaining("/movies/m1/poster?v=abc&sig=def")
    );

    expect(mockedGetMovies).toHaveBeenCalledWith(
      { page: 1, pageSize: 8, q: undefined, sort: "newest" },
      "tok"
    );
  });

  it("navigates to a concrete edit url, not the route pattern", async () => {
    localStorage.setItem("userToken", "tok");
    mockedGetMovies.mockResolvedValue(page([movie()]));

    renderMovies();
    await waitFor(() => expect(screen.getByText("Arrival")).toBeInTheDocument());

    await userEvent.click(screen.getByRole("button", { name: "Edit Arrival" }));

    expect(mockNavigate).toHaveBeenCalledWith("/movies/m1/edit", {
      state: { movie: movie() },
    });
  });

  it("clears the local session even when the logout call fails", async () => {
    localStorage.setItem("userToken", "tok");
    mockedGetMovies.mockResolvedValue(page([movie()]));
    mockedLogout.mockRejectedValue(new Error("server down"));

    renderMovies();
    await waitFor(() => expect(screen.getByText("Arrival")).toBeInTheDocument());

    await userEvent.click(screen.getByRole("button", { name: /Logout/ }));

    await waitFor(() => expect(localStorage.getItem("userToken")).toBeNull());
    expect(mockNavigate).toHaveBeenCalledWith("/signin");
  });
});

describe("Movies page - search", () => {
  beforeEach(() => {
    localStorage.setItem("userToken", "tok");
  });

  it("sends the typed query to the API and resets to the first page", async () => {
    mockedGetMovies.mockResolvedValue(page([movie()], { page: 3, totalPages: 5, hasMore: true }));

    renderMovies();
    await waitFor(() => expect(screen.getByText("Arrival")).toBeInTheDocument());

    await userEvent.type(
      screen.getByLabelText("Search your movies"),
      "90s sci-fi"
    );
    await userEvent.click(screen.getByRole("button", { name: "Search" }));

    await waitFor(() =>
      expect(mockedGetMovies).toHaveBeenLastCalledWith(
        { page: 1, pageSize: 8, q: "90s sci-fi", sort: "newest" },
        "tok"
      )
    );
  });

  it("shows how the query was interpreted, and by what", async () => {
    mockedGetMovies.mockResolvedValue(
      page([movie()], {}, {
        source: "ai",
        text: "sci-fi",
        yearFrom: 1990,
        yearTo: 1999,
        tags: ["sci-fi"],
        sort: "newest",
        summary: "sci-fi released between 1990 and 1999",
      })
    );

    renderMovies();

    await waitFor(() =>
      expect(
        screen.getByText("sci-fi released between 1990 and 1999")
      ).toBeInTheDocument()
    );
    expect(screen.getByText("AI search")).toBeInTheDocument();
  });

  it("labels a rule-based reading as such", async () => {
    mockedGetMovies.mockResolvedValue(
      page([movie()], {}, {
        source: "rules",
        text: "dune",
        yearFrom: null,
        yearTo: null,
        tags: [],
        sort: "newest",
        summary: "matching “dune”",
      })
    );

    renderMovies();

    await waitFor(() => expect(screen.getByText("Rule-based")).toBeInTheDocument());
  });

  it("offers to clear the search instead of claiming the collection is empty", async () => {
    mockedGetMovies.mockResolvedValueOnce(page([movie()]));

    renderMovies();
    await waitFor(() => expect(screen.getByText("Arrival")).toBeInTheDocument());

    mockedGetMovies.mockResolvedValue(page([]));
    await userEvent.type(screen.getByLabelText("Search your movies"), "zzzz");
    await userEvent.click(screen.getByRole("button", { name: "Search" }));

    await waitFor(() =>
      expect(screen.getByText(/Nothing matched/)).toBeInTheDocument()
    );
    // The "empty collection" screen would be a lie here - there is one movie.
    expect(screen.queryByText("Your movie list is empty")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Clear search" })).toBeInTheDocument();
  });

  it("re-requests with the chosen sort order", async () => {
    mockedGetMovies.mockResolvedValue(page([movie()]));

    renderMovies();
    await waitFor(() => expect(screen.getByText("Arrival")).toBeInTheDocument());

    await userEvent.selectOptions(screen.getByLabelText("Sort order"), "title");

    await waitFor(() =>
      expect(mockedGetMovies).toHaveBeenLastCalledWith(
        { page: 1, pageSize: 8, q: undefined, sort: "title" },
        "tok"
      )
    );
  });
});

describe("Movies page - pagination", () => {
  beforeEach(() => {
    localStorage.setItem("userToken", "tok");
  });

  it("is hidden when everything fits on one page", async () => {
    mockedGetMovies.mockResolvedValue(page([movie()]));

    renderMovies();
    await waitFor(() => expect(screen.getByText("Arrival")).toBeInTheDocument());

    expect(screen.queryByRole("navigation", { name: "Pagination" })).not.toBeInTheDocument();
  });

  it("requests the next page and disables Previous on the first", async () => {
    mockedGetMovies.mockResolvedValue(
      page([movie()], { page: 1, total: 20, totalPages: 3, hasMore: true })
    );

    renderMovies();
    await waitFor(() => expect(screen.getByText("Arrival")).toBeInTheDocument());

    const nav = screen.getByRole("navigation", { name: "Pagination" });
    expect(within(nav).getByRole("button", { name: "Previous" })).toBeDisabled();
    expect(within(nav).getByText(/Page 1 of 3/)).toBeInTheDocument();

    await userEvent.click(within(nav).getByRole("button", { name: "Next" }));

    await waitFor(() =>
      expect(mockedGetMovies).toHaveBeenLastCalledWith(
        { page: 2, pageSize: 8, q: undefined, sort: "newest" },
        "tok"
      )
    );
  });

  it("disables Next on the last page", async () => {
    mockedGetMovies.mockResolvedValue(
      page([movie()], { page: 3, total: 20, totalPages: 3, hasMore: false })
    );

    renderMovies();
    await waitFor(() => expect(screen.getByText("Arrival")).toBeInTheDocument());

    const nav = screen.getByRole("navigation", { name: "Pagination" });
    expect(within(nav).getByRole("button", { name: "Next" })).toBeDisabled();
  });
});

describe("Movies page - delete", () => {
  beforeEach(() => {
    localStorage.setItem("userToken", "tok");
  });

  it("asks for confirmation and reloads the list", async () => {
    mockedGetMovies.mockResolvedValue(page([movie()]));
    mockedDeleteMovie.mockResolvedValue(undefined);
    jest.spyOn(window, "confirm").mockReturnValue(true);

    renderMovies();
    await waitFor(() => expect(screen.getByText("Arrival")).toBeInTheDocument());

    await userEvent.click(screen.getByRole("button", { name: "Delete Arrival" }));

    await waitFor(() => expect(mockedDeleteMovie).toHaveBeenCalledWith("m1", "tok"));
    expect(mockedGetMovies).toHaveBeenCalledTimes(2);
  });

  it("does nothing when the confirmation is declined", async () => {
    mockedGetMovies.mockResolvedValue(page([movie()]));
    jest.spyOn(window, "confirm").mockReturnValue(false);

    renderMovies();
    await waitFor(() => expect(screen.getByText("Arrival")).toBeInTheDocument());

    await userEvent.click(screen.getByRole("button", { name: "Delete Arrival" }));

    expect(mockedDeleteMovie).not.toHaveBeenCalled();
  });

  it("reports a failed delete without dropping the list", async () => {
    mockedGetMovies.mockResolvedValue(page([movie()]));
    mockedDeleteMovie.mockRejectedValue(new Error("boom"));
    jest.spyOn(window, "confirm").mockReturnValue(true);

    renderMovies();
    await waitFor(() => expect(screen.getByText("Arrival")).toBeInTheDocument());

    await userEvent.click(screen.getByRole("button", { name: "Delete Arrival" }));

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent("We could not delete that movie")
    );
    expect(screen.getByText("Arrival")).toBeInTheDocument();
  });
});
