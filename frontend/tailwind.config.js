/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'sand-green':       'rgb(var(--accent-light) / <alpha-value>)',
        'sand-green-dark':  'rgb(var(--accent) / <alpha-value>)',
        'sand-blue':        'rgb(var(--secondary-light) / <alpha-value>)',
        'sand-blue-medium': 'rgb(var(--secondary-medium) / <alpha-value>)',
        'sand-blue-dark':   'rgb(var(--secondary-dark) / <alpha-value>)',
        'sand-blue-deep':   'rgb(var(--secondary-deep) / <alpha-value>)',
        'cream':            'rgb(var(--bg) / <alpha-value>)',
        'warm-gray':        'rgb(var(--warm-gray) / <alpha-value>)',
        'soft-brown':       'rgb(var(--soft) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
