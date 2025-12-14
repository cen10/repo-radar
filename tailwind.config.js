/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        github: {
          bg: '#0d1117',
          'bg-secondary': '#161b22',
          border: '#30363d',
          text: '#c9d1d9',
          'text-secondary': '#8b949e',
          accent: '#58a6ff',
          success: '#3fb950',
          warning: '#d29922',
          danger: '#f85149',
        },
      },
      fontFamily: {
        mono: ['Fira Code', 'SF Mono', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        shimmer: 'shimmer 2s ease-in-out infinite',
      },
      keyframes: {
        shimmer: {
          '0%': { opacity: '1' },
          '50%': { opacity: '0.5' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
