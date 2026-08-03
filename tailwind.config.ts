import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#FEF3EC",
          100: "#FCE1D1",
          200: "#F8C0A0",
          300: "#F29A6A",
          400: "#EC7A3E",
          500: "#E5641C",
          600: "#C4510F",
          700: "#9C400C",
          800: "#7A330E",
          900: "#642C10",
        },
        steel: {
          50: "#EEF4FA",
          100: "#D9E6F2",
          200: "#B4CCE3",
          300: "#84A9CD",
          400: "#5583B2",
          500: "#356197",
          600: "#2C5C8A",
          700: "#254A6E",
          800: "#213E5B",
          900: "#1E354D",
        },
      },
      fontFamily: {
        sans: [
          "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto",
          "Helvetica Neue", "Arial", "sans-serif",
        ],
      },
      boxShadow: {
        card: "0 1px 2px rgba(20,32,43,.05), 0 8px 24px -14px rgba(20,32,43,.14)",
      },
    },
  },
  plugins: [],
};

export default config;
