import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Fundo médico escuro
        bg: {
          primary: '#0f172a',
          secondary: '#1e293b',
          tertiary: '#334155',
          card: '#1e2a3a',
        },
        // Accent azul-ciano
        accent: {
          DEFAULT: '#0ea5e9',
          hover: '#38bdf8',
          muted: '#0284c7',
        },
        // Status
        success: '#22c55e',
        warning: '#f59e0b',
        danger: '#ef4444',
        // Texto
        text: {
          primary: '#f1f5f9',
          secondary: '#94a3b8',
          muted: '#64748b',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
} satisfies Config
