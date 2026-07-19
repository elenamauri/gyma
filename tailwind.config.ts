import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        chalk: "#FAFAF8",
        ink: "#161614",
        accent: "#E1442C",
        muted: "#8A8880",
        hairline: "rgba(22, 22, 20, 0.12)",
        plate: {
          red: "#C62828",
          blue: "#1565C0",
          yellow: "#F9A825",
          green: "#2E7D32",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        body: ["var(--font-body)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      borderRadius: {
        none: "0",
        sm: "0",
        DEFAULT: "0",
        md: "0",
        lg: "0",
      },
    },
  },
  plugins: [],
};
export default config;
