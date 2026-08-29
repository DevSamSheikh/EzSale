/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Brand and ink are CSS variables so the theme module can reskin
        // the entire app by updating :root. The `<alpha-value>` placeholder
        // is required for Tailwind to generate opacity modifiers
        // (e.g. `bg-brand-500/60`).
        brand: {
          50: 'rgb(var(--brand-50-rgb) / <alpha-value>)',
          100: 'rgb(var(--brand-100-rgb) / <alpha-value>)',
          200: 'rgb(var(--brand-200-rgb) / <alpha-value>)',
          300: 'rgb(var(--brand-300-rgb) / <alpha-value>)',
          400: 'rgb(var(--brand-400-rgb) / <alpha-value>)',
          500: 'rgb(var(--brand-500-rgb) / <alpha-value>)',
          600: 'rgb(var(--brand-600-rgb) / <alpha-value>)',
          700: 'rgb(var(--brand-700-rgb) / <alpha-value>)',
          800: 'rgb(var(--brand-800-rgb) / <alpha-value>)',
          900: 'rgb(var(--brand-900-rgb) / <alpha-value>)',
          DEFAULT: 'rgb(var(--brand-500-rgb) / <alpha-value>)',
        },
        ink: {
          50: 'rgb(var(--ink-50-rgb) / <alpha-value>)',
          100: 'rgb(var(--ink-100-rgb) / <alpha-value>)',
          200: 'rgb(var(--ink-200-rgb) / <alpha-value>)',
          300: 'rgb(var(--ink-300-rgb) / <alpha-value>)',
          400: 'rgb(var(--ink-400-rgb) / <alpha-value>)',
          500: 'rgb(var(--ink-500-rgb) / <alpha-value>)',
          600: 'rgb(var(--ink-600-rgb) / <alpha-value>)',
          700: 'rgb(var(--ink-700-rgb) / <alpha-value>)',
          800: 'rgb(var(--ink-800-rgb) / <alpha-value>)',
          900: 'rgb(var(--ink-900-rgb) / <alpha-value>)',
          DEFAULT: 'rgb(var(--ink-900-rgb) / <alpha-value>)',
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
