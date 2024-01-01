/** @type {import('tailwindcss').Config} */
// Create React App loads this file with `require()`, so it must use CommonJS
// exports. With ESM `export const` syntax the config silently fails to load
// and none of the custom colours / content globs are applied.
//
// The palette is a darkened auditorium: warm near-black, programme-paper text
// and a marquee-bulb amber for the one thing on each screen you act on.
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#14110E",
        paper: "#F2E8D5",
        primary: "#E9A23B",
        primaryHover: "#F3B65A",
        error: "#F0786A",
        backgroundColor: "#14110E",
        inputColor: "#2A241E",
        cardColor: "#1D1915",
        cardColorHover: "#25201A",
      },
      fontFamily: {
        display: ["Fraunces", "Georgia", "Cambria", "serif"],
        sans: [
          "Manrope",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};
