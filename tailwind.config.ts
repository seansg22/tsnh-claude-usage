import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/renderer/**/*.{ts,tsx,html}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'claude-orange': '#E8632A',
        'claude-orange-hover': '#D4581F',
        'claude-bg': '#0F0F0F',
        'claude-surface': '#1A1A1A',
        'claude-border': '#2A2A2A',
        'claude-text': '#E8E8E8',
        'claude-muted': '#8A8A8A',
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'sans-serif',
        ],
        mono: ['SF Mono', 'JetBrains Mono', 'Fira Code', 'monospace'],
      },
    },
  },
  plugins: [],
}

export default config
