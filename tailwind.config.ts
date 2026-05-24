import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "#05040f",
        surface: "#0d0b1e",
        "purple-faint": "#1a1535",
        "purple-mid": "#4a3f8f",
        "purple-bright": "#7c6fd4",
        "purple-glow": "#a89be8",
        lavender: "#c9c2f0",
        "amber-glow": "#f5a623",
        "off-white": "#f0eeff",
        "text-body": "#b8b0d8",
        "text-muted": "#6b6490",
      },
      fontFamily: {
        cormorant: ["var(--font-cormorant)", "Georgia", "serif"],
        outfit: ["var(--font-outfit)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
