/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Roboto"', '"Noto Sans"', '"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
        serif: ['"Noto Sans"', '"Plus Jakarta Sans"', 'Georgia', 'serif'],
      },
      colors: {
        brand: {
          50: '#f0fdfa',
          100: '#e0f7fa',
          200: '#b2ebf2',
          300: '#67d4d9',
          400: '#1d999d',
          500: '#008689',
          600: '#00797c',
          700: '#006669',
          800: '#005154',
          900: '#003d40',
          950: '#00282a',
        },
        uth: {
          teal: '#008689',
          tealHover: '#1d999d',
          tealDark: '#006d70',
          tealLight: '#e0f7fa',
          crimson: '#da1c2d',
          crimsonDark: '#b91c1c',
        },
        surface: {
          base: '#f7f9fb',
          card: '#ffffff',
          subtle: '#f1f5f9',
          border: '#e2e8f0',
          hover: '#f8fafc',
        }
      },
      boxShadow: {
        'glow-sm': '0 4px 14px -2px rgba(0, 134, 137, 0.2)',
        'glow-md': '0 10px 25px -5px rgba(0, 134, 137, 0.28)',
        'glow-emerald': '0 6px 18px -4px rgba(16, 185, 129, 0.28)',
      }
    },
  },
  plugins: [],
}
