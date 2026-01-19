import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Brand colors
        primary: {
          DEFAULT: '#1a1f36',
          50: '#f0f1f4',
          100: '#d9dce5',
          200: '#b3b9cb',
          300: '#8d96b1',
          400: '#677397',
          500: '#41507d',
          600: '#1a1f36',
          700: '#15192c',
          800: '#101322',
          900: '#0b0d18',
        },
        accent: {
          DEFAULT: '#f5a623',
          50: '#fef9ed',
          100: '#fdf0d0',
          200: '#fbe4a7',
          300: '#f9d67d',
          400: '#f7c654',
          500: '#f5a623',
          600: '#d48b0f',
          700: '#a66d0c',
          800: '#784f09',
          900: '#4a3106',
        },
        // Semantic colors
        profit: '#10b981',
        loss: '#ef4444',
        background: '#0f1117',
        surface: '#1a1f2e',
        border: '#2d3548',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px #f5a623, 0 0 10px #f5a623' },
          '100%': { boxShadow: '0 0 20px #f5a623, 0 0 30px #f5a623' },
        },
      },
    },
  },
  plugins: [],
}

export default config
