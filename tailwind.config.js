/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eef4f0',
          100: '#d4e3da',
          200: '#a9c7b5',
          300: '#7eab90',
          400: '#538f6b',
          500: '#2f6b4d',
          600: '#1f4031',
          700: '#173026',
          800: '#10241c',
          900: '#0a1812',
          950: '#050c09',
        },
        accent: {
          50: '#fbf5ee',
          100: '#f5e7d3',
          200: '#ebcfa7',
          300: '#e0b77b',
          400: '#d39f57',
          500: '#c68043',
          600: '#a86833',
          700: '#854f25',
          800: '#623a1b',
          900: '#3f2511',
        },
      },
      backdropBlur: {
        xs: '2px',
        sm: '4px',
        md: '12px',
        lg: '16px',
        xl: '24px',
        '2xl': '40px',
        '3xl': '64px',
      },
    },
  },
  plugins: [],
}
