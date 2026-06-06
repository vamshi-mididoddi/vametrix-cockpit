import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['var(--font-jbm)', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      colors: {
        // Refined dark palette — Linear/Vercel inspired
        bg: {
          DEFAULT:     '#0a0a0b',
          soft:        '#0f0f11',
          card:        '#141417',
          cardhover:   '#1a1a1f',
          subtle:      '#0c0c0e',
          border:      'rgba(255, 255, 255, 0.06)',
          borderhover: 'rgba(255, 255, 255, 0.12)',
        },
        accent: {
          50:  '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          300: '#6ee7b7',
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
        },
      },
      borderRadius: {
        'md': '10px',
        'lg': '12px',
        'xl': '16px',
        '2xl': '20px',
      },
      boxShadow: {
        'card':       '0 1px 2px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.04) inset',
        'card-hover': '0 4px 16px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.08) inset',
        'glow':       '0 0 40px rgba(16, 185, 129, 0.2)',
        'glow-hot':   '0 0 40px rgba(244, 63, 94, 0.18)',
        'pop':        '0 12px 36px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.06)',
      },
      animation: {
        'fade-in':  'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        'pulse-soft': 'pulseSoft 2.5s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
      },
    },
  },
  plugins: [],
};
export default config;
