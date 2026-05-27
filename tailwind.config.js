/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        cream: { DEFAULT: '#f0ebe0', 2: '#e8e2d6', 3: '#ddd6c8' },
        navy: { DEFAULT: '#1a2340', 2: '#232f50', 3: '#0d1420' },
        gold: { DEFAULT: '#c49228', 2: '#d4a83a', pale: '#f5e6c0' },
        forest: '#2d5a2d',
        background: 'var(--cream)',
        foreground: 'var(--text)',
        accent: 'var(--gold)',
        brand: {
          DEFAULT: 'var(--brand)',
          contrast: 'var(--brand-contrast)'
        },
      },
      fontFamily: {
        serif: ['Playfair Display', 'Georgia', 'serif'],
        sans: ['Inter', 'DM Sans', 'system-ui', 'sans-serif'],
      },
      borderRadius: { sm: '6px', md: '12px', lg: '18px', xl: '24px' },
      boxShadow: {
        s1: '0 2px 12px rgba(26,35,64,.07)',
        s2: '0 8px 36px rgba(26,35,64,.11)',
        s3: '0 24px 72px rgba(26,35,64,.16)',
      },
    },
  },
  plugins: [],
};
