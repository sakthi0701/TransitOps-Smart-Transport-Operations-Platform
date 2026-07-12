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
        // Redefined color tokens for professional high-density dark mode
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
          DEFAULT: "#e65100",  // Burnt Orange action anchor
          dark:    "#ff6f00",
        },
        surface: {
          DEFAULT: "#121212",  // Main Canvas: Deep Charcoal Grey
          card:    "#1e1e2e",  // Containers/Cards: Muted Dark Grey
          border:  "#888888",  // Subtle grey borders
          muted:   "#555555",  // Disabled/Read-only
        },
        // Override standard Tailwind color shades for absolute consistency across existing elements
        slate: {
          50:  "#e0e0e0",
          100: "#e0e0e0",  // Crisp Off-White primary text
          200: "#e0e0e0",
          300: "#e0e0e0",
          400: "#a0a0a0",  // Muted Grey dense table text
          500: "#888888",  // Medium Grey secondary captions/labels
          600: "#888888",
          700: "#555555",
          800: "#333333",
          900: "#1e1e2e",
        },
        emerald: {
          400: "#4caf50",  // Forest Green
          500: "#4caf50",
        },
        red: {
          400: "#ef5350",  // Soft Red
          500: "#ef5350",
          600: "#ef5350",
        },
        blue: {
          300: "#42a5f5",  // Pale Blue
          400: "#42a5f5",
          500: "#42a5f5",
          600: "#42a5f5",
        },
        teal: {
          400: "#42a5f5",  // Map teal badges to Pale Blue status as well
          500: "#42a5f5",
        }
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
