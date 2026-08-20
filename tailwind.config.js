/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Superfícies (dark first)
        ink: {
          900: '#0A0B0F', // fundo da app
          800: '#12141A', // superfície base
          700: '#191C24', // card
          600: '#222630', // card elevado / input
          500: '#2E333F', // borda
          400: '#3D4351', // borda destacada
        },
        // Texto
        mist: {
          100: '#F4F6FB',
          200: '#C8CEDC',
          300: '#8D96AA',
          400: '#646D80',
        },
        // Acento principal
        brand: {
          400: '#7C9CFF',
          500: '#5B7CFA',
          600: '#4360E0',
        },
        // Semânticos de status
        ok: '#37D399',
        warn: '#F5B849',
        danger: '#FF6B6B',
      },
      borderRadius: {
        card: '18px',
      },
    },
  },
  plugins: [],
};
