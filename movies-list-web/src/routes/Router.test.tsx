import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import { Router } from "./Router";

jest.mock("pages/Signin", () => ({ Signin: () => <div>sign in page</div> }));
jest.mock("pages/Movies", () => ({ Movies: () => <div>movies page</div> }));
jest.mock("pages/NewMovie", () => ({ NewMovie: () => <div>new movie page</div> }));
jest.mock("pages/EditMovie", () => ({ EditMovie: () => <div>edit movie page</div> }));

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Router />
    </MemoryRouter>
  );

describe("Router", () => {
  // Every route is lazily loaded, so each assertion has to await its chunk.
  it.each([
    ["/signin", "sign in page"],
    ["/movies", "movies page"],
    ["/movies/new", "new movie page"],
    ["/movies/6590abc/edit", "edit movie page"],
  ])("renders %s", async (path, expected) => {
    renderAt(path);
    expect(await screen.findByText(expected)).toBeInTheDocument();
  });

  it("redirects unknown paths to sign-in", async () => {
    renderAt("/nowhere");
    expect(await screen.findByText("sign in page")).toBeInTheDocument();
  });

  it("prefers the /movies/new route over the :id edit pattern", async () => {
    renderAt("/movies/new");
    expect(await screen.findByText("new movie page")).toBeInTheDocument();
    expect(screen.queryByText("edit movie page")).not.toBeInTheDocument();
  });
});
