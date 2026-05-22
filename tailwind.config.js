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
          50: '#f0f7f3',
          100: '#d9ebe1',
          200: '#b3d7c3',
          300: '#8cc3a5',
          400: '#66af87',
          500: '#3d8a63',
          600: '#2f6b4d',
          700: '#235339',
          800: '#1a3f2b',
          900: '#0f2419',
          950: '#081410',
        },
        accent: {
          50: '#fdf8f3',
          100: '#f9edd9',
          200: '#f3dbb3',
          300: '#edc98d',
          400: '#e7b767',
          500: '#d4a574',
          600: '#c18a4f',
          700: '#9a6d3f',
          800: '#73522f',
          900: '#4d371f',
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
