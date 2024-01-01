// Loaded automatically by Create React App before every test file.
import "@testing-library/jest-dom";

// jsdom ships no implementation of the object-URL APIs that the movie list
// uses to render posters, so provide inert stand-ins.
const createObjectURL = jest.fn();
const revokeObjectURL = jest.fn();

Object.defineProperty(URL, "createObjectURL", {
  writable: true,
  value: createObjectURL,
});

Object.defineProperty(URL, "revokeObjectURL", {
  writable: true,
  value: revokeObjectURL,
});

beforeEach(() => {
  // CRA enables `resetMocks`, which strips the implementation above before
  // every test - reinstate it here.
  createObjectURL.mockReturnValue("blob:mock-object-url");
});

afterEach(() => {
  localStorage.clear();
});
