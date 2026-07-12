/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",  // Toggle dark mode via 'dark' class on <html>
  theme: {
    extend: {
      colors: {
        // TransitOps brand palette — deep navy + electric teal
        primary: {
          50:  "#eef9ff",
          100: "#d9f2ff",
          200: "#bce8ff",
          300: "#8ed9ff",
          400: "#59c2ff",
          500: "#33a7fc",
          600: "#1a8af1",
          700: "#1371de",
          800: "#165ab4",
          900: "#184d8e",
          950: "#122f5e",
        },
        accent: {
          DEFAULT: "#00e5c9",
          dark: "#00b8a0",
        },
        surface: {
          DEFAULT: "#0f172a",  // dark bg
          card:    "#1e293b",
          border:  "#334155",
          muted:   "#475569",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      animation: {
        "fade-in": "fadeIn 0.2s ease-in-out",
        "slide-up": "slideUp 0.3s ease-out",
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { transform: "translateY(8px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
      },
    },
  },
  plugins: [],
}
