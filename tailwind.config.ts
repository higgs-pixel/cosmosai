import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cosmos: {
          black: "#03040A",
          abyss: "#070914",
          night: "#0B1020",
          orbit: "#111827",
          steel: "#1B2437",
          slate: "#334155",
          mist: "#94A3B8",
          frost: "#CBD5E1",
          white: "#F8FAFC",
        },
        oxygen: {
          400: "#38BDF8",
          500: "#0EA5E9",
          600: "#0284C7",
        },
        ion: {
          300: "#67E8F9",
          500: "#06B6D4",
        },
        solar: {
          300: "#FDE68A",
          500: "#F59E0B",
        },
        mars: {
          400: "#FB7185",
          600: "#E11D48",
        },
        aurora: {
          400: "#34D399",
        },
        ai: "#A78BFA",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "system-ui", "sans-serif"],
        display: ["var(--font-inter)", "Inter", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "SF Mono", "ui-monospace", "monospace"],
      },
      boxShadow: {
        void: "0 24px 80px rgba(0, 0, 0, 0.48)",
        panel: "0 16px 48px rgba(0, 0, 0, 0.36)",
        card: "0 10px 30px rgba(0, 0, 0, 0.28)",
        "glow-oxygen": "0 0 32px rgba(56, 189, 248, 0.32)",
        "glow-ai": "0 0 36px rgba(167, 139, 250, 0.28)",
        "glow-solar": "0 0 28px rgba(245, 158, 11, 0.26)",
      },
      opacity: {
        4: "0.04",
        7: "0.07",
        8: "0.08",
        12: "0.12",
        14: "0.14",
        16: "0.16",
        18: "0.18",
        22: "0.22",
        24: "0.24",
        26: "0.26",
        28: "0.28",
        32: "0.32",
        34: "0.34",
        35: "0.35",
        36: "0.36",
        38: "0.38",
        42: "0.42",
        45: "0.45",
        46: "0.46",
        48: "0.48",
        52: "0.52",
        55: "0.55",
        58: "0.58",
        65: "0.65",
        72: "0.72",
        78: "0.78",
        86: "0.86",
        88: "0.88",
      },
      backgroundImage: {
        "stellar-horizon":
          "radial-gradient(circle at 50% 0%, rgba(56,189,248,0.22), transparent 34%), linear-gradient(180deg, #070914 0%, #03040A 72%)",
        "solar-edge":
          "linear-gradient(90deg, rgba(245,158,11,0), rgba(245,158,11,0.45), rgba(56,189,248,0))",
        "ai-aurora":
          "linear-gradient(135deg, rgba(167,139,250,0.26), rgba(6,182,212,0.18), rgba(3,4,10,0))",
        "orbital-metal":
          "linear-gradient(180deg, rgba(248,250,252,0.10), rgba(148,163,184,0.03))",
      },
      animation: {
        "orbital-drift": "orbital-drift 18s ease-in-out infinite",
        "scanline-sweep": "scanline-sweep 1600ms cubic-bezier(0.2, 0.8, 0.2, 1) both",
      },
      keyframes: {
        "orbital-drift": {
          "0%, 100%": { transform: "translate3d(0, 0, 0) rotate(0deg)" },
          "50%": { transform: "translate3d(14px, -12px, 0) rotate(0.65deg)" },
        },
        "scanline-sweep": {
          "0%": { transform: "translateX(-120%)", opacity: "0" },
          "20%": { opacity: "1" },
          "100%": { transform: "translateX(120%)", opacity: "0" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
