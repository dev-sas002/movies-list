/** @type {import('tailwindcss').Config} */
// Create React App loads this file with `require()`, so it must use CommonJS
// exports. With ESM `export const` syntax the config silently fails to load
// and none of the custom colours / content globs are applied.
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#2BD17E",
        error: "#EB5757",
        backgroundColor: "#093545",
        inputColor: "#224957",
        cardColor: "#092C39",
      },
    },
  },
  plugins: [],
};
