import type { Config } from "tailwindcss";

// Institutional, calm palette. Tokens are defined as CSS variables in
// src/app/globals.css so light/dark can be adjusted without touching markup.
const config: Config = {
  content: ["./src/**/*.{ts,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        border: "hsl(var(--border))",
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        // Lemoore College / West Hills brand palette (blue + gold, Golden Eagles).
        // Exact institutional hex codes are not published publicly; these approximate
        // the reference site (white header, dark-navy utility bar + footer, blue links,
        // gold accents) and are the single source of truth for the reproduced shell.
        lc: {
          navy: "#012c54",
          "navy-dark": "#001b36",
          blue: "#005baa",
          "blue-dark": "#00468a",
          "blue-light": "#e7f0f9",
          gold: "#f5a81c",
          "gold-dark": "#d68f0a",
          ink: "#1d2733",
          slate: "#5b6875",
          line: "#e3e7ec",
          wash: "#f4f6f8",
        },
      },
      maxWidth: {
        site: "1240px",
      },
    },
  },
  plugins: [],
};

export default config;
