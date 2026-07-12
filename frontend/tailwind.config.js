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
        primary: {
          50:  "#fff3e0",
          100: "#ffe0b2",
          200: "#ffcc80",
          300: "#ffb74d",
          400: "#ffa726",
          500: "#ff6f00",  // Lighter orange (hover state)
          600: "#e65100",  // Burnt Orange (primary accent)
          700: "#d84315",
          800: "#bf360c",
          900: "#e65100",
          950: "#7d2600",
        },
        accent: {
          DEFAULT: "#e65100",
          dark:    "#ff6f00",
        },
        // Surface tokens — light-mode defaults (dark overridden via CSS vars)
        surface: {
          DEFAULT: "#f4f5f7",   // page canvas (light)
          card:    "#ffffff",   // cards/sidebar (light)
          border:  "#d1d5db",   // borders (light)
          muted:   "#e5e7eb",   // muted bg (light)
        },
        // Slate — standard Tailwind neutral scale restored for light mode
        slate: {
          50:  "#f9fafb",
          100: "#f3f4f6",
          200: "#e5e7eb",
          300: "#d1d5db",
          400: "#9ca3af",
          500: "#6b7280",
          600: "#4b5563",
          700: "#374151",
          800: "#1f2937",
          900: "#111827",
        },
        emerald: {
          400: "#4caf50",
          500: "#4caf50",
        },
        red: {
          400: "#ef5350",
          500: "#ef5350",
          600: "#ef5350",
        },
        blue: {
          50:  "#eff6ff",
          100: "#dbeafe",
          200: "#bfdbfe",
          300: "#42a5f5",
          400: "#42a5f5",
          500: "#42a5f5",
          600: "#42a5f5",
        },
        teal: {
          400: "#42a5f5",
          500: "#42a5f5",
        }
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      animation: {
        "fade-in":    "fadeIn 0.2s ease-in-out",
        "slide-up":   "slideUp 0.3s ease-out",
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
      keyframes: {
        fadeIn: {
          "0%":   { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%":   { transform: "translateY(8px)", opacity: "0" },
          "100%": { transform: "translateY(0)",   opacity: "1" },
        },
      },
    },
  },
  plugins: [],
}
