/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        felt: {
          DEFAULT: '#0b3d2e',
          light: '#125c44',
          dark: '#062a20',
        },
        ink: {
          950: '#07090c',
          900: '#0d1117',
          800: '#141a22',
          700: '#1b232e',
          600: '#26313f',
        },
        gold: {
          DEFAULT: '#e3b64f',
          light: '#f5d78a',
          dark: '#a97e2b',
        },
        felthouse: {
          emerald: '#0b3d2e',
          midnight: '#101a33',
          crimson: '#3d0b17',
          royal: '#1a1033',
        },
      },
      fontFamily: {
        display: ['"Outfit"', 'system-ui', 'sans-serif'],
        body: ['"Inter"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 25px rgba(227, 182, 79, 0.55)',
        card: '0 2px 6px rgba(0,0,0,0.4), 0 8px 20px rgba(0,0,0,0.25)',
      },
      keyframes: {
        dealIn: {
          '0%': { opacity: '0', transform: 'translate(var(--deal-x, 0), var(--deal-y, -40px)) rotate(-8deg) scale(0.6)' },
          '100%': { opacity: '1', transform: 'translate(0,0) rotate(0deg) scale(1)' },
        },
        popIn: {
          '0%': { transform: 'scale(0.7)', opacity: '0' },
          '60%': { transform: 'scale(1.08)', opacity: '1' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 0px rgba(227,182,79,0.0)' },
          '50%': { boxShadow: '0 0 22px rgba(227,182,79,0.75)' },
        },
      },
      animation: {
        dealIn: 'dealIn 0.45s cubic-bezier(0.2, 0.8, 0.2, 1) forwards',
        popIn: 'popIn 0.35s ease-out forwards',
        pulseGlow: 'pulseGlow 1.6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
