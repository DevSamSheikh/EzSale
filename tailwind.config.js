/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Brand: lime / neon green
        brand: {
          50: '#f3ffe6',
          100: '#e6ffce',
          200: '#cfff9d',
          300: '#b8ff6c',
          400: '#9eff3a',
          500: '#84eb0a',
          600: '#6cc800',
          700: '#559c00',
          800: '#437800',
          900: '#355c00',
        },
        // Dark charcoal text
        ink: {
          50: '#f6f7f8',
          100: '#eceef0',
          200: '#d5d8dd',
          300: '#b1b7c0',
          400: '#7e8694',
          500: '#535b6a',
          600: '#3a414d',
          700: '#2a3038',
          800: '#1d2229',
          900: '#13171c',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 1px 2px 0 rgb(15 23 42 / 0.04), 0 1px 3px 0 rgb(15 23 42 / 0.06)',
        card: '0 1px 2px 0 rgb(15 23 42 / 0.04), 0 4px 16px -4px rgb(15 23 42 / 0.06)',
        pop: '0 10px 30px -10px rgb(15 23 42 / 0.18)',
      },
      borderRadius: {
        pill: '9999px',
      },
    },
  },
  plugins: [],
}
