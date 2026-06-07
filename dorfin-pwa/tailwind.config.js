/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        dorfin: {
          bg:        '#0F0B1E',
          card:      '#1A1530',
          surface:   '#241E3A',
          border:    '#3A3060',
          green:     '#39FF14',
          'green-dim': '#22CC00',
          'green-glow': 'rgba(57,255,20,0.15)',
          purple:    '#7C5CBF',
          'purple-light': '#A080E0',
          text:      '#F0EEF8',
          muted:     '#8B84A8',
          faint:     '#4A4468',
        },
        rir: {
          0: '#FF4444',
          1: '#FF8C00',
          2: '#39FF14',
          4: '#4A9EFF',
        },
      },
      fontFamily: {
        display: ['"Bebas Neue"', 'cursive'],
        body: ['"DM Sans"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        glow: '0 0 20px rgba(57,255,20,0.25)',
        'glow-sm': '0 0 10px rgba(57,255,20,0.15)',
        card: '0 4px 24px rgba(0,0,0,0.4)',
      },
      backgroundImage: {
        'gradient-card': 'linear-gradient(135deg, #1A1530 0%, #241E3A 100%)',
        'gradient-green': 'linear-gradient(135deg, #39FF14 0%, #22CC00 100%)',
      },
      animation: {
        'pulse-green': 'pulseGreen 2s ease-in-out infinite',
        'flame': 'flame 1.5s ease-in-out infinite alternate',
        'bounce-in': 'bounceIn 0.4s cubic-bezier(0.34,1.56,0.64,1)',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        pulseGreen: {
          '0%,100%': { boxShadow: '0 0 10px rgba(57,255,20,0.2)' },
          '50%': { boxShadow: '0 0 25px rgba(57,255,20,0.5)' },
        },
        flame: {
          '0%': { transform: 'scale(1) rotate(-2deg)' },
          '100%': { transform: 'scale(1.05) rotate(2deg)' },
        },
        bounceIn: {
          '0%': { transform: 'scale(0.8)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(12px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
