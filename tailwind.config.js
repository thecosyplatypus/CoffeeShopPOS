/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        coffee: {
          50: '#fdf8f0', 100: '#f9eddb', 200: '#f2d8b0', 300: '#e9bd7c',
          400: '#e09d4a', 500: '#d4852e', 600: '#b56722', 700: '#97501f',
          800: '#7c4121', 900: '#66371e', 950: '#3a1b0e',
        },
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.06)',
        'card-hover': '0 4px 6px -1px rgb(0 0 0 / 0.08), 0 2px 4px -2px rgb(0 0 0 / 0.06)',
        'sidebar': '2px 0 8px -2px rgb(0 0 0 / 0.06)',
        'modal': '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
      },
    },
  },
  plugins: [],
}
