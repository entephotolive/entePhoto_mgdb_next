import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx,jsx}",
    "./components/**/*.{ts,tsx,jsx}",
    "./hooks/**/*.{ts,tsx,jsx}",
    "./lib/**/*.{ts,tsx,jsx}",
    "./*.{jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#0a0a0b",
        surface: "#121214",
        muted: "#94a3b8", // slate-400
        primary: "#22d3ee", // cyan-400
        accent: "#00E5FF", // neon cyan
        success: "#34d399",
        warning: "#fbbf24",
        danger: "#ef4444", // red-500
      },
      boxShadow: {
        glow: "0 0 20px rgba(34, 211, 238, 0.4)",
        "glow-lg": "0 0 40px rgba(34, 211, 238, 0.2)",
        panel: "0 24px 80px rgba(10, 10, 11, 0.8)",
        glass: "0 8px 32px 0 rgba(0, 0, 0, 0.8)",
      },
      backgroundImage: {
        "page-grid":
          "radial-gradient(circle at top, rgba(34, 211, 238, 0.05), transparent 40%), linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)",
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
      },
      backgroundSize: {
        "page-grid": "auto, 60px 60px, 60px 60px",
      },
      borderRadius: {
        "4xl": "2rem",
        portal: "90px", // Rounded top for cards
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-8px)" },
        },
        pulseLine: {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(380%)" },
        },
        "bounce-slow": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        aurora: {
          "0%, 100%": {
            "background-position": "50% 50%, 50% 50%",
            "background-size": "300% 300%, 300% 300%",
          },
          "50%": {
            "background-position": "100% 100%, 100% 100%",
            "background-size": "150% 150%, 150% 150%",
          },
        },
        "pulse-slow": {
          "0%, 100%": { opacity: "0.3" },
          "50%": { opacity: "0.6" },
        },
      },
      animation: {
        float: "float 6s ease-in-out infinite",
        pulseLine: "pulseLine 3s ease-in-out infinite",
        "bounce-slow": "bounce-slow 4s ease-in-out infinite",
        aurora: "aurora 60s linear infinite",
        "pulse-slow": "pulse-slow 8s ease-in-out infinite",
      },
      fontFamily: {
        sans: ["var(--font-sora)", "system-ui", "sans-serif"],
        mono: ["var(--font-jetbrains-mono)", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
