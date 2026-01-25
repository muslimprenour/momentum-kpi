/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        'brand': {
          50: '#fef7ee',
          100: '#fdedd3',
          200: '#fad7a6',
          300: '#f6ba6e',
          400: '#f19235',
          500: '#ee7410',
          600: '#df5a08',
          700: '#b94309',
          800: '#93350f',
          900: '#772e10',
        }
      }
    },
  },
  plugins: [],
}
