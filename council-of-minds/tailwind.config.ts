import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        chamber: {
          dark: '#0a0a0f',
          accent: '#12121a',
          border: '#1e1e2e',
          glow: '#2a2a3a',
        },
        persona: {
          sage: '#8b5cf6',
          maverick: '#ef4444',
          pragmatist: '#10b981',
          dreamer: '#3b82f6',
          historian: '#f59e0b',
          empath: '#ec4899',
          analyst: '#6b7280',
        },
      },
      fontFamily: {
        display: ['var(--font-display)', 'serif'],
        body: ['var(--font-body)', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'float': 'float 6s ease-in-out infinite',
        'typing': 'typing 1s ease-in-out infinite',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 20px var(--glow-color, rgba(139, 92, 246, 0.3))' },
          '100%': { boxShadow: '0 0 40px var(--glow-color, rgba(139, 92, 246, 0.6))' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        typing: {
          '0%, 100%': { opacity: '0.3' },
          '50%': { opacity: '1' },
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'chamber-pattern': 'radial-gradient(circle at center, rgba(139, 92, 246, 0.05) 0%, transparent 70%)',
      },
    },
  },
  plugins: [],
};

export default config;

