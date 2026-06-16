import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        display: ['Sora', 'sans-serif'],
      },
      colors: {
        brand: {
          50: '#f0f7ff',
          100: '#e0eefe',
          200: '#bfddfd',
          300: '#93c6fb',
          400: '#60a8f6',
          500: '#3b8af0',
          600: '#2570e0',
          700: '#1f59c4',
        },
        sky: {
          glow: '#7cc4ff',
        },
      },
      boxShadow: {
        card: '0 16px 40px -18px rgba(37, 99, 235, 0.35)',
        soft: '0 8px 24px -12px rgba(59, 130, 246, 0.25)',
        glow: '0 0 0 1px rgba(96, 168, 246, 0.4), 0 12px 36px -10px rgba(59, 138, 240, 0.55)',
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(96, 168, 246, 0.45)' },
          '50%': { boxShadow: '0 0 28px 4px rgba(96, 168, 246, 0.55)' },
        },
        floaty: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        pulseGlow: 'pulseGlow 2s ease-in-out infinite',
        floaty: 'floaty 6s ease-in-out infinite',
        shimmer: 'shimmer 2.2s linear infinite',
      },
    },
  },
  plugins: [],
};

export default config;
