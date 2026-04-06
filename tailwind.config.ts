import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx,js,jsx,mdx}",
    "./src/components/**/*.{ts,tsx,js,jsx,mdx}",
    "./src/hooks/**/*.{ts,tsx,js,jsx,mdx}",
    "./src/lib/**/*.{ts,tsx,js,jsx,mdx}",
    "./src/data/**/*.{ts,tsx,js,jsx,mdx}",
    "./src/types/**/*.{ts,tsx,js,jsx,mdx}",
    "./src/**/*.{ts,tsx,js,jsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "rgb(var(--background) / <alpha-value>)",
        foreground: "rgb(var(--foreground) / <alpha-value>)",
        surface: "rgb(var(--surface) / <alpha-value>)",
        card: {
          DEFAULT: "rgb(var(--card) / <alpha-value>)",
          foreground: "rgb(var(--card-foreground) / <alpha-value>)",
        },
        popover: {
          DEFAULT: "rgb(var(--popover) / <alpha-value>)",
          foreground: "rgb(var(--popover-foreground) / <alpha-value>)",
        },
        primary: {
          DEFAULT: "rgb(var(--primary) / <alpha-value>)",
          foreground: "rgb(var(--primary-foreground) / <alpha-value>)",
        },
        secondary: {
          DEFAULT: "rgb(var(--secondary) / <alpha-value>)",
          foreground: "rgb(var(--secondary-foreground) / <alpha-value>)",
        },
        muted: {
          DEFAULT: "rgb(var(--muted) / <alpha-value>)",
          foreground: "rgb(var(--muted-foreground) / <alpha-value>)",
        },
        accent: {
          DEFAULT: "rgb(var(--accent) / <alpha-value>)",
          foreground: "rgb(var(--accent-foreground) / <alpha-value>)",
        },
        border: "rgb(var(--border) / <alpha-value>)",
        input: "rgb(var(--input) / <alpha-value>)",
        ring: "rgb(var(--ring) / <alpha-value>)",
        success: "rgb(var(--success) / <alpha-value>)",
        warning: "rgb(var(--warning) / <alpha-value>)",
        danger: "rgb(var(--danger) / <alpha-value>)",
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
        sm: "calc(var(--radius) - 0.25rem)",
        md: "calc(var(--radius) - 0.125rem)",
        lg: "var(--radius)",
        xl: "calc(var(--radius) + 0.5rem)",
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
        sans: ["Geist Variable", "system-ui", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Monaco", "Consolas", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
