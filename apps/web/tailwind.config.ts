import type { Config } from 'tailwindcss';

export default {
  darkMode: ['class'],
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        sand: '#F5EFE2',
        ink: '#1F1B16',
        clay: '#C8653D',
        moss: '#4D6B57',
        mist: '#DDE3E8'
      }
    }
  },
  plugins: []
} satisfies Config;
