/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: 'class',
    content: [
      './src/client/**/*.{js,ts,jsx,tsx}',
      './index.html',
    ],
    theme: {
      extend: {
        colors: {
          nomad: {
            500: '#0073ec',
            600: '#0062c3',
            700: '#004e9e',
          },
          monokai: {
            bg: '#272822',
            surface: '#3E3D32',
            text: '#F8F8F2',
            muted: '#75715E',
            green: '#A6E22E',
            red: '#F92672',
            yellow: '#E6DB74',
            blue: '#66D9EF',
            orange: '#FD971F',
            purple: '#AE81FF',
          },
        },
      },
    },
    plugins: [],
  };