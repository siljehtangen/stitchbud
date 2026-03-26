/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'sand-green': '#C6D8B8',
        'sand-green-dark': '#A8C49A',
        'sand-blue': '#BFD8E0',
        'sand-blue-medium': '#A8CEDA',
        'sand-blue-dark': '#9DC4CF',
        'sand-blue-deep': '#6FA8BC',
        'cream': '#F5F0E8',
        'warm-gray': '#8B7355',
        'soft-brown': '#D4C4A8',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
