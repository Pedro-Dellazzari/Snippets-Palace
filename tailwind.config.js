/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  future: {
    hoverOnlyWhenSupported: true,
  },
  theme: {
    extend: {
      fontFamily: {
        'system': ['-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', '"Helvetica Neue"', 'Arial', 'sans-serif'],
      },
      fontSize: {
        'xs': ['0.6875rem', { lineHeight: '1rem' }],      // 11px (era 12px)
        'sm': ['0.8125rem', { lineHeight: '1.25rem' }],   // 13px (era 14px)
        'base': ['0.9375rem', { lineHeight: '1.5rem' }],  // 15px (era 16px)
        'lg': ['1.0625rem', { lineHeight: '1.75rem' }],   // 17px (era 18px)
        'xl': ['1.1875rem', { lineHeight: '1.75rem' }],   // 19px (era 20px)
        '2xl': ['1.4375rem', { lineHeight: '2rem' }],     // 23px (era 24px)
        '3xl': ['1.8125rem', { lineHeight: '2.25rem' }],  // 29px (era 30px)
        '4xl': ['2.1875rem', { lineHeight: '2.5rem' }],   // 35px (era 36px)
        '5xl': ['2.9375rem', { lineHeight: '1' }],        // 47px (era 48px)
        '6xl': ['3.6875rem', { lineHeight: '1' }],        // 59px (era 60px)
        '7xl': ['4.4375rem', { lineHeight: '1' }],        // 71px (era 72px)
        '8xl': ['5.9375rem', { lineHeight: '1' }],        // 95px (era 96px)
        '9xl': ['7.9375rem', { lineHeight: '1' }],        // 127px (era 128px)
      },
      colors: {
        gray: {
          50: '#f9fafb',
          100: '#f3f4f6',
          200: '#e5e7eb',
          300: '#d1d5db',
          400: '#9ca3af',
          500: '#6b7280',
          600: '#4b5563',
          700: '#374151',
          800: '#1f2937',
          900: '#111827',
        }
      },
      animation: {
        'slide-in': 'slideIn 0.2s ease-out',
        'fade-in': 'fadeIn 0.15s ease-out'
      },
      keyframes: {
        slideIn: {
          '0%': { transform: 'translateX(-10px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' }
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        }
      }
    },
  },
  plugins: [],
}