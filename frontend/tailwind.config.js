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
        'ink':              'rgb(var(--ink) / <alpha-value>)',
        'craft-knit':       '#78A073',
        'craft-knit-text':  '#446B40',
        'craft-crochet':    '#6AA8C4',
        'craft-crochet-text': '#3A6E88',
        'craft-sew':        '#C8956B',
        'craft-sew-text':   '#8A5A32',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        serif: ['Instrument Serif', 'serif'],
      },
      boxShadow: {
        'warm': '0 1px 2px rgba(76,41,35,.05), 0 18px 40px -24px rgba(76,41,35,.18)',
        'warm-lg': '0 2px 4px rgba(76,41,35,.06), 0 28px 50px -28px rgba(76,41,35,.26)',
      },
    },
  },
  plugins: [],
}
