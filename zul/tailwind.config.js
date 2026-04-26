/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        zul: {
          pink: '#ec4899',
          purple: '#a855f7',
        }
      }
    },
  },
  plugins: [],
}
