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
        brand: {
          DEFAULT: "#c02425",
          dark: "#8f1819",
          light: "#f26a4b",
        },
        charcoal: "#1f2430",
      },
      keyframes: {
        "pulse-once": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(192,36,37,0.4)" },
          "50%": { boxShadow: "0 0 0 8px rgba(192,36,37,0)" },
        },
      },
      animation: {
        "pulse-once": "pulse-once 1.2s ease-out 3",
      },
    },
  },
  plugins: [],
};

export default config;
