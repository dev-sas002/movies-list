import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

import { MovieForm } from "./MovieForm";
import { Movie } from "contracts/api";
import { createMovie, updateMovie } from "../services/api";

jest.mock("../services/api", () => ({
  ...jest.requireActual("../services/api"),
  createMovie: jest.fn(),
  updateMovie: jest.fn(),
}));

const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));

const mockedCreate = createMovie as jest.MockedFunction<typeof createMovie>;
const mockedUpdate = updateMovie as jest.MockedFunction<typeof updateMovie>;

const movie = (overrides: Partial<Movie> = {}): Movie => ({
  id: "m1",
  title: "Arrival",
  publishYear: 2016,
  synopsis: "Linguist meets heptapods.",
  tags: ["sci-fi", "drama"],
  posterUrl: "/movies/m1/poster?v=abc&sig=def",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  ...overrides,
});

const renderForm = (props: Parameters<typeof MovieForm>[0] = {}) =>
  render(
    <MemoryRouter>
      <MovieForm {...props} />
    </MemoryRouter>
  );

const fillAndSubmit = async (title: string, year: string, buttonName: RegExp) => {
  await userEvent.type(screen.getByPlaceholderText("Title"), title);
  await userEvent.type(screen.getByPlaceholderText("Publishing year"), year);
  await userEvent.click(screen.getByRole("button", { name: buttonName }));
};

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  jest.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("MovieForm - create", () => {
  it("validates before calling the API", async () => {
    localStorage.setItem("userToken", "tok");
    renderForm();

    await userEvent.click(screen.getByRole("button", { name: /Submit/ }));

    await waitFor(() =>
      expect(screen.getByLabelText("Please enter movie title")).toBeInTheDocument()
    );
    expect(mockedCreate).not.toHaveBeenCalled();
  });

  it("rejects a year before the first film was made", async () => {
    localStorage.setItem("userToken", "tok");
    renderForm();

    await fillAndSubmit("Arrival", "1200", /Submit/);

    await waitFor(() =>
      expect(screen.getByLabelText("The first film was made in 1878")).toBeInTheDocument()
    );
    expect(mockedCreate).not.toHaveBeenCalled();
  });

  it("posts the form fields and redirects to the list", async () => {
    localStorage.setItem("userToken", "tok");
    mockedCreate.mockResolvedValue(movie());
    renderForm();

    await userEvent.type(screen.getByPlaceholderText("Title"), "Arrival");
    await userEvent.type(screen.getByPlaceholderText("Publishing year"), "2016");
    await userEvent.type(
      screen.getByPlaceholderText("Tags (comma separated)"),
      "sci-fi, drama"
    );
    await userEvent.type(screen.getByPlaceholderText("Synopsis"), "Heptapods arrive.");
    await userEvent.click(screen.getByRole("button", { name: /Submit/ }));

    await waitFor(() => expect(mockedCreate).toHaveBeenCalledTimes(1));

    const [formData, token] = mockedCreate.mock.calls[0];
    expect(formData.get("title")).toBe("Arrival");
    expect(formData.get("publicationYear")).toBe("2016");
    expect(formData.get("tags")).toBe("sci-fi, drama");
    expect(formData.get("synopsis")).toBe("Heptapods arrive.");
    expect(formData.get("image")).toBeNull();
    expect(token).toBe("tok");
    expect(mockNavigate).toHaveBeenCalledWith("/movies");
  });

  it("bounces to sign-in when the token is gone", async () => {
    renderForm();

    await fillAndSubmit("Arrival", "2016", /Submit/);

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/signin"));
    expect(mockedCreate).not.toHaveBeenCalled();
  });

  it("shows the API's own message and stays put when the server rejects the movie", async () => {
    localStorage.setItem("userToken", "tok");
    mockedCreate.mockRejectedValue(new Error("A poster image is required"));
    renderForm();

    await fillAndSubmit("Arrival", "2016", /Submit/);

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent("A poster image is required")
    );
    expect(mockNavigate).not.toHaveBeenCalledWith("/movies");
  });
});

describe("MovieForm - edit", () => {
  const initialData = movie();

  it("pre-fills every field from the existing movie", () => {
    renderForm({ isEditState: true, initialData });

    expect(screen.getByPlaceholderText("Title")).toHaveValue("Arrival");
    expect(screen.getByPlaceholderText("Publishing year")).toHaveValue("2016");
    expect(screen.getByPlaceholderText("Tags (comma separated)")).toHaveValue(
      "sci-fi, drama"
    );
    expect(screen.getByPlaceholderText("Synopsis")).toHaveValue(
      "Linguist meets heptapods."
    );
    expect(screen.getByRole("button", { name: "Update" })).toBeInTheDocument();
  });

  it("previews the poster already stored for the movie", async () => {
    renderForm({ isEditState: true, initialData });

    await waitFor(() =>
      expect(screen.getByAltText("Arrival poster")).toHaveAttribute(
        "src",
        expect.stringContaining("/movies/m1/poster?v=abc&sig=def")
      )
    );
  });

  it("passes the movie id to updateMovie", async () => {
    localStorage.setItem("userToken", "tok");
    mockedUpdate.mockResolvedValue(movie());
    renderForm({ isEditState: true, initialData });

    await userEvent.clear(screen.getByPlaceholderText("Title"));
    await userEvent.type(screen.getByPlaceholderText("Title"), "Arrival (2016)");
    await userEvent.click(screen.getByRole("button", { name: "Update" }));

    await waitFor(() => expect(mockedUpdate).toHaveBeenCalledTimes(1));

    const [movieId, formData, token] = mockedUpdate.mock.calls[0];
    expect(movieId).toBe("m1");
    expect(formData.get("title")).toBe("Arrival (2016)");
    expect(token).toBe("tok");
    expect(mockedCreate).not.toHaveBeenCalled();
  });

  it("omits the image when the poster was not replaced", async () => {
    localStorage.setItem("userToken", "tok");
    mockedUpdate.mockResolvedValue(movie());
    renderForm({ isEditState: true, initialData });

    await userEvent.click(screen.getByRole("button", { name: "Update" }));

    await waitFor(() => expect(mockedUpdate).toHaveBeenCalledTimes(1));
    // Sending an empty image field would wipe the stored poster.
    expect(mockedUpdate.mock.calls[0][1].get("image")).toBeNull();
  });

  it("reports an update failure", async () => {
    localStorage.setItem("userToken", "tok");
    mockedUpdate.mockRejectedValue(new Error("Movie not found or unauthorized to update"));
    renderForm({ isEditState: true, initialData });

    await userEvent.click(screen.getByRole("button", { name: "Update" }));

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Movie not found or unauthorized to update"
      )
    );
  });
});
