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
        // Lantern palette — from Ghost Species Lenia shader
        void: {
          DEFAULT: "#010106",
          deep: "#030109",
          soft: "#0a0f1a",
        },
        lantern: {
          violet: "#6120ae",
          gold: "#d4a017",
          amber: "#f59e0b",
          hotcore: "#ffe68c",
          wisp: "#1f478c",
          warm: "#b3730d",
          cool: "#144099",
        },
        // Project colors
        genesis: "#4ecdc4",
        ghouljamz: "#f59e0b",
        daedalus: "#a78bfa",
        curamuir: "#ec4899",
        chromogenesis: "#00eeff",
        research: "#d4a017",
        // UI
        ink: {
          DEFAULT: "#c8cfe0",
          muted: "#5a6b8a",
          faint: "#2a3456",
          ghost: "#1a2236",
        },
      },
      fontFamily: {
        serif: ["Cormorant Garamond", "Georgia", "serif"],
        sans: ["DM Sans", "Helvetica Neue", "sans-serif"],
        mono: ["JetBrains Mono", "Consolas", "monospace"],
      },
      animation: {
        "breathe": "breathe 7s ease-in-out infinite",
        "shimmer": "shimmer 10s linear infinite",
        "fade-up": "fadeUp 0.8s cubic-bezier(0.22, 1, 0.36, 1) both",
      },
      keyframes: {
        breathe: {
          "0%, 100%": { opacity: "0.35" },
          "50%": { opacity: "0.65" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% center" },
          "100%": { backgroundPosition: "200% center" },
        },
        fadeUp: {
          from: { opacity: "0", transform: "translateY(24px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
