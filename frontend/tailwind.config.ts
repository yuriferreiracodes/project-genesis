import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Obsidian + Acid Lime palette
        obsidian: "#0C1010",
        panel: { DEFAULT: "#1A2321", raised: "#212C29" },
        line: { DEFAULT: "#26302E", strong: "#34413D" },
        ink: { DEFAULT: "#E8EEE9", muted: "#9AA6A0", dim: "#5F6B66" },
        acid: { DEFAULT: "#C6F566", dim: "#9BC24A" },
      },
      fontFamily: {
        sans: ["var(--font-sans)"],
        display: ["var(--font-display)"],
        mono: ["var(--font-mono)"],
      },
    },
  },
  plugins: [],
};

export default config;
