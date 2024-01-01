import { createRequire } from 'module';

const require = createRequire(import.meta.url);

/** @type {import('tailwindcss').Config} */
export const content = ["./src/**/*.{js,jsx,ts,tsx}"];
export const theme = {
  extend: {
    colors: {
      primary: "#2BD17E",
      error: "#EB5757",
      backgroundColor: "#093545",
      inputColor: "#224957",
      cardColor: "#092C39",
    },
  },
};
export const plugins = [];
