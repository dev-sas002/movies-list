import { ROUTES, editMoviePath } from "./routes";

describe("editMoviePath", () => {
  it("substitutes the id into the route pattern", () => {
    expect(editMoviePath("6590abc")).toBe("/movies/6590abc/edit");
  });

  it("does not append the id to the raw pattern", () => {
    // The original bug produced "/movies/:id/edit/6590abc", which matched
    // no route and bounced the user back to the sign-in page.
    expect(editMoviePath("6590abc")).not.toContain(":id");
    expect(editMoviePath("6590abc")).not.toBe(`${ROUTES.editMovie}/6590abc`);
  });

  it("escapes ids that contain url-unsafe characters", () => {
    expect(editMoviePath("a b/c")).toBe("/movies/a%20b%2Fc/edit");
  });
});
