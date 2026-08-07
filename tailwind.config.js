/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        darkred: {
          950: '#0d0204',
          900: '#1a0408',
          850: '#24060b',
          800: '#32080f',
          700: '#480c16',
          600: '#64101e',
          500: '#8b1528',
          accent: '#e63946',
          highlight: '#ff4d5a'
        }
      }
    },
  },
  plugins: [],
}
