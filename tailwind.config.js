/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        kp: {
          brand: '#123f28',
          brandHover: '#0b2a1a',
          accent: '#3fcf63',
          surface: '#f2f2ed',
          text: '#16130f',
          border: 'rgba(0, 0, 0, 0.08)',
        },
      },
      borderRadius: {
        kp: '10px',
      },
    },
  },
  plugins: [],
};
