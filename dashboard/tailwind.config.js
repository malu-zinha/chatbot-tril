/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Cores baseadas no logo TecPred
        tecpred: {
          primary: '#2E3192',     // Azul escuro do logo
          secondary: '#4A4FB7',   // Azul médio
          accent: '#6B70D9',      // Azul claro
          dark: '#1A1D5E',        // Azul muito escuro
          light: '#E8E9F8',       // Azul muito claro
          white: '#FFFFFF',
          orange: '#FF6B35',      // Laranja do logo
          coral: '#FF8C61',       // Coral claro
        },
        'tecpred-primary': '#2E3192',
        'tecpred-secondary': '#4A4FB7',
        'tecpred-accent': '#6B70D9',
        'tecpred-orange': '#FF6B35',
        'tecpred-coral': '#FF8C61',
        'tecpred-light': '#E8E9F8',
        success: '#10B981',
        warning: '#FF6B35',
        danger: '#EF4444',
        info: '#2E3192',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.5s ease-in',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}

