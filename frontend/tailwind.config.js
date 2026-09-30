/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#101311',
        panel: '#171b18',
        line: '#2b312d',
        parchment: '#e9e5dc',
        brass: '#c39a65',
        sage: '#91a995',
      },
      fontFamily: {
        sans: ['DM Sans', 'sans-serif'],
        display: ['Manrope', 'sans-serif'],
        mono: ['DM Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
