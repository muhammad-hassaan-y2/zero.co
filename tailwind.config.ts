import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: ['./src/**/*.{ts,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
      },
      boxShadow: {
        glow: '0 0 80px rgba(34, 211, 238, .22)',
      },
      animation: {
        orbit: 'orbit 18s linear infinite',
        float: 'float 8s ease-in-out infinite',
      },
      keyframes: {
        orbit: { to: { transform: 'rotate(360deg)' } },
        float: { '0%, 100%': { transform: 'translateY(0px)' }, '50%': { transform: 'translateY(-18px)' } },
      },
    },
  },
  plugins: [],
};
export default config;
