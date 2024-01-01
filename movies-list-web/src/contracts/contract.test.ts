import fs from "fs";
import path from "path";

// Create React App cannot import from outside src/, so the client compiles
// against a copy of the HTTP contract. This fails when that copy drifts.
it("matches shared/contracts/api.ts - run `npm run contract:sync` from the repo root", () => {
  const root = path.resolve(__dirname, "..", "..", "..");
  const source = fs.readFileSync(path.join(root, "shared", "contracts", "api.ts"), "utf8");
  const copy = fs.readFileSync(path.join(__dirname, "api.ts"), "utf8");

  expect(copy).toBe(source);
});
