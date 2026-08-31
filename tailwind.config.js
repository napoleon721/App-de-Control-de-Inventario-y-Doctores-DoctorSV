/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          blue: "#0048B5",       // Deep Royal Blue from DoctorSV logo
          blueDark: "#003487",   // Darker navy blue
          blueLight: "#EBF3FF",  // Soft ice blue
          cyan: "#0095FF",       // Electric Cyan from SV logo
          cyanLight: "#E0F2FE",  // Soft cyan
          cyanDark: "#0284C7",
          navy: "#0A192F",
          dark: "#0F172A",
        },
      },
      fontFamily: {
        sans: ["'Plus Jakarta Sans'", "sans-serif"],
        heading: ["'Outfit'", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"],
      },
      boxShadow: {
        'subtle': '0 2px 10px rgba(0, 72, 181, 0.04), 0 1px 3px rgba(0, 0, 0, 0.03)',
        'card': '0 8px 30px rgba(15, 23, 42, 0.06)',
        'glow-blue': '0 0 25px rgba(0, 72, 181, 0.18)',
        'glow-cyan': '0 0 25px rgba(0, 149, 255, 0.22)',
      }
    },
  },
  plugins: [],
}
